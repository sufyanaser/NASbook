import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

interface CollapsiblePluginState {
  readonly collapsedPositions: ReadonlySet<number>;
  readonly manualHeadingPositions: ReadonlySet<number>;
}

interface SectionBlock {
  readonly node: ProseMirrorNode;
  readonly position: number;
}

interface CollapsibleSection {
  readonly heading: SectionBlock;
  readonly content: readonly SectionBlock[];
}

interface ToggleSectionMeta {
  readonly position: number;
  readonly manual: boolean;
}

interface ResetSectionsMeta {
  readonly reset: true;
}

export interface ActiveCollapsibleSection {
  readonly position: number;
  readonly collapsed: boolean;
}

const collapsibleSectionsKey = new PluginKey<CollapsiblePluginState>("nasCollapsibleSections");

function mapPositions(positions: ReadonlySet<number>, transaction: Transaction): ReadonlySet<number> {
  const mappedPositions = new Set<number>();
  positions.forEach((position) => {
    const mapped = transaction.mapping.mapResult(position, 1);
    if (!mapped.deleted) mappedPositions.add(mapped.pos);
  });
  return mappedPositions;
}

function styledCharacterRatio(node: ProseMirrorNode, predicate: (mark: ProseMirrorNode["marks"][number]) => boolean): number {
  let totalCharacters = 0;
  let styledCharacters = 0;
  node.descendants((child) => {
    if (!child.isText || !child.text) return;
    const characters = child.text.trim().length;
    totalCharacters += characters;
    if (child.marks.some(predicate)) styledCharacters += characters;
  });
  return totalCharacters === 0 ? 0 : styledCharacters / totalCharacters;
}

function isVisualHeading(node: ProseMirrorNode): boolean {
  if (node.type.name !== "paragraph" || node.textContent.trim() === "") return false;
  const largeTextRatio = styledCharacterRatio(node, (mark) => {
    const fontSize = Number.parseFloat(String(mark.attrs.fontSize ?? ""));
    return Number.isFinite(fontSize) && fontSize >= 18;
  });
  const strongTextRatio = styledCharacterRatio(node, (mark) => {
    if (mark.type.name === "bold") return true;
    const fontWeight = Number.parseInt(String(mark.attrs.fontWeight ?? ""), 10);
    return Number.isFinite(fontWeight) && fontWeight >= 600;
  });
  return largeTextRatio >= 0.8 && strongTextRatio >= 0.8;
}

function structuralLevel(block: SectionBlock): number | null {
  return block.node.type.name === "heading" ? Number(block.node.attrs.level) : null;
}

function isSectionHeading(block: SectionBlock, manualPositions: ReadonlySet<number>): boolean {
  return block.node.type.name === "heading"
    || manualPositions.has(block.position)
    || isVisualHeading(block.node);
}

function collectSections(
  doc: ProseMirrorNode,
  manualPositions: ReadonlySet<number>,
): readonly CollapsibleSection[] {
  const blocks: SectionBlock[] = [];
  doc.forEach((node, position) => blocks.push({ node, position }));

  return blocks.flatMap((heading, headingIndex) => {
    if (!isSectionHeading(heading, manualPositions)) return [];
    const headingLevel = structuralLevel(heading);
    const content: SectionBlock[] = [];

    for (let index = headingIndex + 1; index < blocks.length; index += 1) {
      const candidate = blocks[index];
      const candidateLevel = structuralLevel(candidate);
      const reachesNextSection = isSectionHeading(candidate, manualPositions)
        && (headingLevel === null || candidateLevel === null || candidateLevel <= headingLevel);
      if (candidate.node.type.name === "horizontalRule" || reachesNextSection) break;
      content.push(candidate);
    }

    return content.length > 0 ? [{ heading, content }] : [];
  });
}

function createDecorations(doc: ProseMirrorNode, pluginState: CollapsiblePluginState): DecorationSet {
  const decorations: Decoration[] = [];
  collectSections(doc, pluginState.manualHeadingPositions).forEach(({ heading, content }) => {
    const collapsed = pluginState.collapsedPositions.has(heading.position);
    decorations.push(Decoration.node(
      heading.position,
      heading.position + heading.node.nodeSize,
      {
        "data-nas-collapse-key": `position-${heading.position}`,
        "data-nas-collapsible": "true",
        "data-nas-collapsed": collapsed ? "true" : "false",
      },
    ));
    if (collapsed) {
      content.forEach((block) => {
        decorations.push(Decoration.node(
          block.position,
          block.position + block.node.nodeSize,
          { "data-nas-collapsed-hidden": "true" },
        ));
      });
    }
  });
  return DecorationSet.create(doc, decorations);
}

function positionFromHeadingElement(element: HTMLElement): number | null {
  const match = /^position-(\d+)$/u.exec(element.dataset.nasCollapseKey ?? "");
  return match ? Number(match[1]) : null;
}

function restoreHeadingAnchor(view: EditorView, heading: HTMLElement, anchorTop: number): void {
  const scrollContainer = view.dom.closest<HTMLElement>(".note-editor-content-wrapper");
  if (!scrollContainer || !heading.isConnected) return;
  const offset = heading.getBoundingClientRect().top - anchorTop;
  if (Math.abs(offset) > 0.5) scrollContainer.scrollTop += offset;
}

function handleHeadingPointerDown(view: EditorView, event: PointerEvent): boolean {
  const heading = event.target instanceof Element
    ? event.target.closest<HTMLElement>("[data-nas-collapsible=\"true\"]")
    : null;
  if (!heading || !view.dom.contains(heading)) return false;

  const rectangle = heading.getBoundingClientRect();
  const isRtl = getComputedStyle(heading).direction === "rtl";
  const hitsToggle = isRtl
    ? event.clientX >= rectangle.right - 34
    : event.clientX <= rectangle.left + 34;
  if (!hitsToggle) return false;

  const position = positionFromHeadingElement(heading);
  const pluginState = collapsibleSectionsKey.getState(view.state);
  if (position === null || !pluginState) return false;

  event.preventDefault();
  event.stopPropagation();
  const anchorTop = rectangle.top;
  const willCollapse = !pluginState.collapsedPositions.has(position);
  let transaction = view.state.tr.setMeta(collapsibleSectionsKey, {
    position,
    manual: pluginState.manualHeadingPositions.has(position),
  } satisfies ToggleSectionMeta);
  if (willCollapse) {
    transaction = transaction
      .setSelection(TextSelection.near(view.state.doc.resolve(position + 1), 1))
      .setMeta("addToHistory", false);
  }
  view.dispatch(transaction);
  restoreHeadingAnchor(view, heading, anchorTop);
  window.requestAnimationFrame(() => restoreHeadingAnchor(view, heading, anchorTop));
  return true;
}

export function getActiveCollapsibleSection(editor: Editor): ActiveCollapsibleSection | null {
  const pluginState = collapsibleSectionsKey.getState(editor.state);
  if (!pluginState) return null;
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "heading" && node.type.name !== "paragraph") continue;
    const position = $from.before(depth);
    const section = collectSections(editor.state.doc, pluginState.manualHeadingPositions)
      .find((candidate) => candidate.heading.position === position);
    if (!section && node.type.name !== "paragraph") return null;
    const canBecomeManualHeading = node.type.name === "paragraph"
      && collectSections(editor.state.doc, new Set([...pluginState.manualHeadingPositions, position]))
        .some((candidate) => candidate.heading.position === position);
    if (!section && !canBecomeManualHeading) return null;
    return { position, collapsed: pluginState.collapsedPositions.has(position) };
  }
  return null;
}

export function toggleActiveCollapsibleSection(editor: Editor): boolean {
  const activeSection = getActiveCollapsibleSection(editor);
  if (!activeSection) return false;
  const node = editor.state.doc.nodeAt(activeSection.position);
  editor.view.dispatch(editor.state.tr.setMeta(collapsibleSectionsKey, {
    position: activeSection.position,
    manual: node?.type.name === "paragraph",
  } satisfies ToggleSectionMeta));
  return true;
}

export function resetCollapsibleSections(editor: Editor): void {
  editor.view.dispatch(editor.state.tr.setMeta(collapsibleSectionsKey, {
    reset: true,
  } satisfies ResetSectionsMeta));
}

export const CollapsibleSections = Extension.create({
  name: "nasCollapsibleSections",

  addProseMirrorPlugins() {
    return [new Plugin<CollapsiblePluginState>({
      key: collapsibleSectionsKey,
      state: {
        init: () => ({
          collapsedPositions: new Set<number>(),
          manualHeadingPositions: new Set<number>(),
        }),
        apply: (transaction, previous) => {
          const meta = transaction.getMeta(collapsibleSectionsKey) as
            | ToggleSectionMeta
            | ResetSectionsMeta
            | undefined;
          if (meta && "reset" in meta) {
            return {
              collapsedPositions: new Set<number>(),
              manualHeadingPositions: new Set<number>(),
            };
          }
          const collapsedPositions = new Set(mapPositions(previous.collapsedPositions, transaction));
          const manualHeadingPositions = new Set(mapPositions(previous.manualHeadingPositions, transaction));
          const toggle = meta as ToggleSectionMeta | undefined;
          if (toggle) {
            if (toggle.manual) manualHeadingPositions.add(toggle.position);
            if (collapsedPositions.has(toggle.position)) collapsedPositions.delete(toggle.position);
            else collapsedPositions.add(toggle.position);
          }
          return { collapsedPositions, manualHeadingPositions };
        },
      },
      props: {
        decorations: (state: EditorState) => {
          const pluginState = collapsibleSectionsKey.getState(state);
          return pluginState ? createDecorations(state.doc, pluginState) : null;
        },
        handleDOMEvents: {
          pointerdown: (view, event) => handleHeadingPointerDown(view, event),
        },
      },
    })];
  },
});
