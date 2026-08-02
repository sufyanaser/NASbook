import "./styles/editor-interaction-stability.css";

const EDITOR_SELECTOR = ".note-editor-content-wrapper .ProseMirror";
let pendingFrame: number | null = null;

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(EDITOR_SELECTOR);
}

function isVisualHeading(block: HTMLElement): boolean {
  if (block.tagName !== "P" || !(block.textContent ?? "").trim()) return false;
  const styledText = block.querySelector<HTMLElement>("span, strong, b") ?? block;
  const style = getComputedStyle(styledText);
  const fontSize = Number.parseFloat(style.fontSize);
  const fontWeight = Number.parseInt(style.fontWeight, 10);
  return fontSize >= 18 && (fontWeight >= 600 || style.fontWeight === "bold");
}

function isSectionHeading(block: HTMLElement): boolean {
  return /^H[1-6]$/u.test(block.tagName) || isVisualHeading(block);
}

function sectionElements(heading: HTMLElement): readonly HTMLElement[] {
  const structuralLevel = /^H[1-6]$/u.test(heading.tagName)
    ? Number(heading.tagName.slice(1))
    : null;
  const section: HTMLElement[] = [];
  let sibling = heading.nextElementSibling;

  while (sibling instanceof HTMLElement) {
    const siblingLevel = /^H[1-6]$/u.test(sibling.tagName)
      ? Number(sibling.tagName.slice(1))
      : null;
    const reachesNextSection = isSectionHeading(sibling)
      && (structuralLevel === null
        || siblingLevel === null
        || siblingLevel <= structuralLevel);

    if (sibling.tagName === "HR" || reachesNextSection) break;
    section.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  return section;
}

function reconcileCollapsibleSections(): void {
  const root = getEditorRoot();
  if (!root) return;

  const blocks = [...root.children].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  );

  blocks.forEach((block, index) => {
    if (!/^(?:P|H[1-6])$/u.test(block.tagName)) return;
    if (!block.dataset.nasCollapseKey) {
      block.dataset.nasCollapseKey =
        `${block.tagName}:${index}:${(block.textContent ?? "").trim()}`;
    }
  });

  blocks.filter(isSectionHeading).forEach((heading) => {
    if (sectionElements(heading).length === 0) return;
    heading.dataset.nasCollapsible = "true";
    if (!heading.dataset.nasCollapsed) {
      heading.dataset.nasCollapsed = "false";
    }
  });
}

function scheduleReconcile(): void {
  if (pendingFrame !== null) return;
  pendingFrame = window.requestAnimationFrame(() => {
    pendingFrame = null;
    reconcileCollapsibleSections();
  });
}

function preserveEditorSelection(event: MouseEvent): void {
  const target = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>(".color-picker-trigger, .color-swatch-button")
    : null;
  if (!target || target.disabled) return;

  const root = getEditorRoot();
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  // Keep ProseMirror's text selection active while React opens the palette or
  // applies a swatch. The click still fires; only the browser focus transfer is blocked.
  event.preventDefault();
}

export function installEditorInteractionStability(): void {
  if (document.documentElement.dataset.nasEditorInteractionStability === "true") return;
  document.documentElement.dataset.nasEditorInteractionStability = "true";

  document.addEventListener("mousedown", preserveEditorSelection, true);
  document.addEventListener("input", scheduleReconcile, true);
  document.addEventListener("focusin", scheduleReconcile, true);
  document.addEventListener("mouseup", scheduleReconcile, true);

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "contenteditable", "data-selected"],
  });

  scheduleReconcile();
  window.setTimeout(scheduleReconcile, 80);
  window.setTimeout(scheduleReconcile, 220);
}
