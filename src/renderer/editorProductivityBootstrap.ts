import type { CategoryRecord } from "../shared/categories";
import type { NasNotesbookApi, NoteListItem } from "../shared/ipc";
import type { AppLanguage } from "../shared/settings";
import { getCategoryDisplayName } from "../shared/i18n";
import "./styles/editor-productivity.css";

interface EditorProductivityBridge {
  readonly getLockedNoteIds: () => Promise<readonly number[]>;
  readonly setLocked: (noteId: number, isLocked: boolean) => Promise<boolean>;
}

type EnhancedApi = NasNotesbookApi & {
  readonly editorProductivity: EditorProductivityBridge;
};

const EXTRA_SWATCHES = [
  { nameAr: "أردوازي", nameEn: "Slate", color: "#475569" },
  { nameAr: "أصفر", nameEn: "Yellow", color: "#eab308" },
  { nameAr: "أزرق سماوي", nameEn: "Sky", color: "#0ea5e9" },
] as const;

const collapsedHeadingKeys = new Set<string>();
const toolbarDisabledState = new WeakMap<HTMLButtonElement, boolean>();
let lockedNoteIds = new Set<number>();
let activeNoteId: number | null = null;
let lastCollapseNoteId: number | null = null;
let savedEditorRange: Range | null = null;
let refreshTimer: number | null = null;
let refreshSequence = 0;

function getApi(): EnhancedApi | null {
  const api = window.nasNotesbook as EnhancedApi | undefined;
  return api?.editorProductivity ? api : null;
}

function isArabic(): boolean {
  return document.documentElement.lang === "ar";
}

function headingLevel(element: Element): number | null {
  const match = /^H([1-6])$/u.exec(element.tagName);
  return match ? Number(match[1]) : null;
}

function sectionElements(heading: HTMLElement): readonly HTMLElement[] {
  const level = headingLevel(heading);
  if (level === null) return [];

  const result: HTMLElement[] = [];
  let sibling = heading.nextElementSibling;
  while (sibling instanceof HTMLElement) {
    const siblingLevel = headingLevel(sibling);
    if (sibling.tagName === "HR" || (siblingLevel !== null && siblingLevel <= level)) {
      break;
    }
    result.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  return result;
}

function headingKey(heading: HTMLElement, index: number): string {
  const level = headingLevel(heading) ?? 0;
  const text = (heading.textContent ?? "").trim().replace(/\s+/gu, " ");
  return `${level}:${index}:${text}`;
}

function applyCollapsedSections(): void {
  const editor = document.querySelector<HTMLElement>(".note-editor-content-wrapper .ProseMirror");
  if (!editor) return;

  editor
    .querySelectorAll<HTMLElement>("[data-nas-collapsed-hidden=\"true\"]")
    .forEach((element) => {
      element.removeAttribute("data-nas-collapsed-hidden");
    });

  const headings = [...editor.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")];
  headings.forEach((heading, index) => {
    const elements = sectionElements(heading);
    const key = headingKey(heading, index);
    heading.dataset.nasCollapseKey = key;

    if (elements.length === 0) {
      heading.removeAttribute("data-nas-collapsible");
      heading.removeAttribute("data-nas-collapsed");
      return;
    }

    heading.dataset.nasCollapsible = "true";
    const collapsed = collapsedHeadingKeys.has(key);
    heading.dataset.nasCollapsed = collapsed ? "true" : "false";
    if (collapsed) {
      elements.forEach((element) => {
        element.dataset.nasCollapsedHidden = "true";
      });
    }

    if (heading.dataset.nasCollapseBound !== "true") {
      heading.dataset.nasCollapseBound = "true";
      heading.addEventListener(
        "pointerdown",
        (event) => {
          if (heading.dataset.nasCollapsible !== "true") return;
          const rectangle = heading.getBoundingClientRect();
          const direction = getComputedStyle(heading).direction;
          const hit =
            direction === "rtl"
              ? event.clientX >= rectangle.right - 34
              : event.clientX <= rectangle.left + 34;
          if (!hit) return;

          event.preventDefault();
          event.stopPropagation();
          const currentKey = heading.dataset.nasCollapseKey;
          if (!currentKey) return;
          if (collapsedHeadingKeys.has(currentKey)) {
            collapsedHeadingKeys.delete(currentKey);
          } else {
            collapsedHeadingKeys.add(currentKey);
          }
          applyCollapsedSections();
        },
        true,
      );
    }
  });
}

function parseRgb(color: string): readonly [number, number, number] | null {
  const match = /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/iu.exec(
    color,
  );
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function linearChannel(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function readableTextColor(background: string): "rgb(17, 24, 39)" | "rgb(255, 255, 255)" {
  const rgb = parseRgb(background);
  if (!rgb) return "rgb(17, 24, 39)";
  const luminance =
    0.2126 * linearChannel(rgb[0]) +
    0.7152 * linearChannel(rgb[1]) +
    0.0722 * linearChannel(rgb[2]);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.057;
  return whiteContrast >= darkContrast
    ? "rgb(255, 255, 255)"
    : "rgb(17, 24, 39)";
}

function applyAutomaticContrast(): void {
  const editor = document.querySelector<HTMLElement>(".note-editor-content-wrapper .ProseMirror");
  if (!editor) return;

  const candidates = new Set<HTMLElement>([
    ...editor.querySelectorAll<HTMLElement>("[style*=\"background-color\"]"),
    ...editor.querySelectorAll<HTMLElement>("[data-nas-auto-contrast=\"true\"]"),
  ]);

  candidates.forEach((element) => {
    const background = element.style.backgroundColor;
    const automatic = element.dataset.nasAutoContrast === "true";

    if (!background) {
      if (automatic) {
        element.style.removeProperty("color");
        delete element.dataset.nasAutoContrast;
        delete element.dataset.nasAutoColor;
      }
      return;
    }

    if (automatic && element.dataset.nasAutoColor && element.style.color !== element.dataset.nasAutoColor) {
      delete element.dataset.nasAutoContrast;
      delete element.dataset.nasAutoColor;
      return;
    }

    if (!automatic && element.style.color) {
      return;
    }

    const computedBackground = getComputedStyle(element).backgroundColor;
    const color = readableTextColor(computedBackground);
    element.style.color = color;
    element.dataset.nasAutoContrast = "true";
    element.dataset.nasAutoColor = color;
  });
}

function restoreEditorSelection(): HTMLElement | null {
  const editor = document.querySelector<HTMLElement>(".note-editor-content-wrapper .ProseMirror");
  if (!editor || !savedEditorRange) return editor;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(savedEditorRange);
  return editor;
}

function enhanceColorPickers(): void {
  document.querySelectorAll<HTMLElement>(".color-picker-menu").forEach((menu) => {
    if (menu.dataset.nasPaletteEnhanced === "true") return;
    const grid = menu.querySelector<HTMLElement>(".color-picker-grid");
    const container = menu.closest<HTMLElement>(".custom-dropdown-container");
    const trigger = container?.querySelector<HTMLButtonElement>(".color-picker-trigger");
    if (!grid || !trigger) return;

    menu.dataset.nasPaletteEnhanced = "true";
    const fillPicker = Boolean(trigger.querySelector('path[d^="M19 11"]'));

    EXTRA_SWATCHES.forEach((swatch) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch-button nas-extra-color-swatch";
      button.style.backgroundColor = swatch.color;
      button.dataset.tooltip = isArabic() ? swatch.nameAr : swatch.nameEn;
      button.setAttribute("aria-label", isArabic() ? swatch.nameAr : swatch.nameEn);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const editor = restoreEditorSelection();
        if (!editor) return;
        editor.focus();
        const command = fillPicker ? "hiliteColor" : "foreColor";
        const applied = document.execCommand(command, false, swatch.color);
        if (!applied && fillPicker) {
          document.execCommand("backColor", false, swatch.color);
        }
        editor.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: fillPicker ? "formatBackColor" : "formatForeColor",
          }),
        );
        trigger.click();
        window.setTimeout(applyAutomaticContrast, 0);
      });
      grid.appendChild(button);
    });
  });
}

function lockBadge(): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = "nas-note-lock-indicator";
  badge.dataset.tooltip = isArabic() ? "مقفلة للقراءة والنسخ" : "Locked for reading and copying";
  badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
  return badge;
}

function applyCardLockState(card: HTMLElement, note: NoteListItem): void {
  card.dataset.noteId = String(note.id);
  const locked = lockedNoteIds.has(note.id);
  card.dataset.nasLocked = locked ? "true" : "false";

  const titleLine = card.querySelector<HTMLElement>(".note-card-topline");
  const existingBadge = card.querySelector<HTMLElement>(".nas-note-lock-indicator");
  if (locked && titleLine && !existingBadge) {
    titleLine.appendChild(lockBadge());
  } else if (!locked) {
    existingBadge?.remove();
  }

  card.querySelectorAll<HTMLButtonElement>(".note-action-button").forEach((button) => {
    button.disabled = locked;
  });
}

async function notesForVisibleCategory(
  api: EnhancedApi,
  categories: readonly CategoryRecord[],
  language: AppLanguage,
): Promise<readonly NoteListItem[]> {
  const activeName = document.querySelector<HTMLElement>(".category-context strong")?.textContent?.trim();
  const activeCategory = categories.find(
    (category) =>
      getCategoryDisplayName(category.slug, category.name, language).trim() === activeName,
  );

  if (!activeCategory || activeCategory.slug === "all-notes") {
    return api.notes.list();
  }
  if (activeCategory.slug === "trash") {
    return api.notes.list({ includeTrash: true });
  }
  return api.notes.list({ categoryId: activeCategory.id });
}

function ensureLockButton(): HTMLButtonElement | null {
  const group = document.querySelector<HTMLElement>(".editor-toolbar .toolbar-group.note-actions");
  if (!group) return null;

  let button = group.querySelector<HTMLButtonElement>(".nas-lock-edit-button");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "toolbar-action-button nas-lock-edit-button";
    button.addEventListener("click", () => {
      void toggleActiveNoteLock();
    });
    const divider = group.querySelector<HTMLElement>(".toolbar-divider");
    group.insertBefore(button, divider ?? null);
  }
  return button;
}

function setLockButtonAppearance(button: HTMLButtonElement, locked: boolean): void {
  button.disabled = activeNoteId === null;
  button.dataset.active = locked ? "true" : "false";
  button.dataset.tooltip = locked
    ? isArabic()
      ? "فتح التعديل"
      : "Unlock editing"
    : isArabic()
      ? "قفل التعديل"
      : "Lock editing";
  button.setAttribute("aria-label", button.dataset.tooltip);
  button.innerHTML = locked
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M9 10V7a4 4 0 0 1 7.5-2"></path></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
}

function setToolbarReadOnly(locked: boolean): void {
  document.querySelectorAll<HTMLButtonElement>(".editor-toolbar button").forEach((button) => {
    if (button.classList.contains("nas-lock-edit-button")) return;
    if (locked) {
      if (!toolbarDisabledState.has(button)) {
        toolbarDisabledState.set(button, button.disabled);
      }
      button.disabled = true;
    } else if (toolbarDisabledState.has(button)) {
      button.disabled = toolbarDisabledState.get(button) ?? false;
      toolbarDisabledState.delete(button);
    }
  });
}

function applyActiveEditorLock(): void {
  const locked = activeNoteId !== null && lockedNoteIds.has(activeNoteId);
  const title = document.querySelector<HTMLInputElement>(".note-title-input");
  const editor = document.querySelector<HTMLElement>(".note-editor-content-wrapper .ProseMirror");
  const wrapper = document.querySelector<HTMLElement>(".note-editor-content-wrapper");
  const lockButton = ensureLockButton();

  if (title) {
    title.readOnly = locked;
    title.dataset.nasLocked = locked ? "true" : "false";
  }
  if (editor) {
    editor.contentEditable = locked ? "false" : "true";
    editor.dataset.nasLocked = locked ? "true" : "false";
  }
  if (wrapper) {
    wrapper.dataset.nasLocked = locked ? "true" : "false";
  }
  if (lockButton) {
    setLockButtonAppearance(lockButton, locked);
  }
  setToolbarReadOnly(locked);

  const editorArea = document.querySelector<HTMLElement>(".editor-area");
  let banner = editorArea?.querySelector<HTMLElement>(".nas-editor-lock-banner") ?? null;
  if (locked && editorArea && !banner) {
    banner = document.createElement("div");
    banner.className = "nas-editor-lock-banner";
    banner.innerHTML = `<span aria-hidden="true">🔒</span><span>${
      isArabic()
        ? "الملاحظة مقفلة للقراءة والنسخ فقط"
        : "This note is locked for reading and copying only"
    }</span>`;
    const toolbar = editorArea.querySelector(".editor-toolbar");
    editorArea.insertBefore(banner, toolbar ?? null);
  } else if (!locked) {
    banner?.remove();
  }
}

async function waitForSaveCompletion(): Promise<boolean> {
  const saveButton = document.querySelector<HTMLButtonElement>(".note-save-group button");
  if (!saveButton || saveButton.disabled) return true;
  saveButton.click();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const status = document.querySelector<HTMLElement>(".save-status-pill")?.dataset.status;
    if (status === "saved" || status === "idle") return true;
    if (status === "error") return false;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
  }
  return false;
}

async function toggleActiveNoteLock(): Promise<void> {
  const api = getApi();
  if (!api || activeNoteId === null) return;
  const currentlyLocked = lockedNoteIds.has(activeNoteId);

  if (!currentlyLocked) {
    const saved = await waitForSaveCompletion();
    if (!saved) return;
  }

  const nextLocked = await api.editorProductivity.setLocked(
    activeNoteId,
    !currentlyLocked,
  );
  if (nextLocked) {
    lockedNoteIds.add(activeNoteId);
  } else {
    lockedNoteIds.delete(activeNoteId);
  }
  applyActiveEditorLock();
  scheduleRefresh();
}

async function refreshUiState(): Promise<void> {
  const api = getApi();
  if (!api) return;
  const sequence = ++refreshSequence;

  try {
    const [ids, categories, settings] = await Promise.all([
      api.editorProductivity.getLockedNoteIds(),
      api.categories.list(),
      api.settings.get(),
    ]);
    const notes = await notesForVisibleCategory(api, categories, settings.language);
    if (sequence !== refreshSequence) return;

    lockedNoteIds = new Set(ids);
    const cards = [...document.querySelectorAll<HTMLElement>(".note-list-card")];
    cards.forEach((card, index) => {
      const note = notes[index];
      if (note) applyCardLockState(card, note);
    });

    const selectedCard = document.querySelector<HTMLElement>(
      '.note-list-card[data-selected="true"]',
    );
    const selectedId = Number(selectedCard?.dataset.noteId ?? 0);
    activeNoteId = Number.isInteger(selectedId) && selectedId > 0 ? selectedId : null;

    if (lastCollapseNoteId !== activeNoteId) {
      collapsedHeadingKeys.clear();
      lastCollapseNoteId = activeNoteId;
    }

    applyActiveEditorLock();
    applyCollapsedSections();
    enhanceColorPickers();
    applyAutomaticContrast();
  } catch (error) {
    console.error("Failed to refresh NASbook editor productivity features:", error);
  }
}

function scheduleRefresh(): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void refreshUiState();
  }, 60);
}

function shouldBlockLockedEdit(event: Event): boolean {
  if (activeNoteId === null || !lockedNoteIds.has(activeNoteId)) return false;
  const target = event.target;
  if (!(target instanceof Node)) return false;
  return Boolean(
    document.querySelector(".note-title-input")?.contains(target) ||
      document.querySelector(".note-editor-content-wrapper")?.contains(target),
  );
}

function handleLockedKeyDown(event: KeyboardEvent): void {
  if (!shouldBlockLockedEdit(event)) return;
  const copy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
  const selectAll = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";
  const find = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
  if (copy || selectAll || find || event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End" || event.key === "PageUp" || event.key === "PageDown") {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

export function installEditorProductivityFeatures(): void {
  if (document.documentElement.dataset.nasEditorProductivity === "true") return;
  document.documentElement.dataset.nasEditorProductivity = "true";

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    const editor = document.querySelector<HTMLElement>(".note-editor-content-wrapper .ProseMirror");
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editor) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedEditorRange = range.cloneRange();
    }
  });

  document.addEventListener("keydown", handleLockedKeyDown, true);
  ["beforeinput", "paste", "drop", "cut"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      (event) => {
        if (!shouldBlockLockedEdit(event)) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );
  });

  const observer = new MutationObserver(() => scheduleRefresh());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "data-selected"],
  });

  scheduleRefresh();
}
