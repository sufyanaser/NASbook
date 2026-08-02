import "./styles/editor-interaction-stability.css";

const EDITOR_SELECTOR = ".note-editor-content-wrapper .ProseMirror";

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(EDITOR_SELECTOR);
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
}
