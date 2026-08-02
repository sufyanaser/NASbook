import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { URL, fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

test("color palette keeps the ProseMirror selection before React swatch clicks", async () => {
  const stability = await source("src/renderer/editorInteractionStability.ts");

  assert.match(stability, /\.color-picker-trigger, \.color-swatch-button/);
  assert.match(stability, /document\.addEventListener\("mousedown", preserveEditorSelection, true\)/);
  assert.match(stability, /event\.preventDefault\(\)/);
  assert.match(stability, /root\.contains\(range\.commonAncestorContainer\)/);
});

test("collapse fallback refreshes headings independent of edit lock state", async () => {
  const stability = await source("src/renderer/editorInteractionStability.ts");

  assert.match(stability, /MutationObserver\(scheduleReconcile\)/);
  assert.match(stability, /attributeFilter: \["class", "style", "contenteditable", "data-selected"\]/);
  assert.match(stability, /sibling\.tagName === "HR"/);
  assert.match(stability, /heading\.dataset\.nasCollapsible = "true"/);
});

test("palette layout exposes sixteen colors after a separate reset control and maps contrast", async () => {
  const styles = await source("src/renderer/styles/editor-interaction-stability.css");

  assert.match(styles, /grid-template-columns: repeat\(4, 24px\)/);
  assert.match(styles, /grid-column: 1 \/ -1/);
  assert.match(styles, /background-color: #475569/);
  assert.match(styles, /background-color: #eab308/);
  assert.match(styles, /background-color: #0ea5e9/);
  assert.match(styles, /color: #ffffff/);
  assert.match(styles, /color: #111827/);
});

test("renderer installs the stability layer", async () => {
  const main = await source("src/renderer/main.tsx");

  assert.match(main, /installEditorInteractionStability/);
  assert.match(main, /installEditorInteractionStability\(\)/);
});
