import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { URL, fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

test("develop includes the complete V04 editor stability layer", async () => {
  const main = await source("src/renderer/main.tsx");
  const behavior = await source("src/renderer/editorInteractionStability.ts");
  const styles = await source("src/renderer/styles/editor-interaction-stability.css");

  assert.match(main, /installEditorInteractionStability\(\)/);
  assert.match(behavior, /preserveEditorSelection/);
  assert.match(behavior, /reconcileCollapsibleSections/);
  assert.match(styles, /grid-template-columns: repeat\(4, 24px\)/);
  assert.match(styles, /color: #ffffff/);
  assert.match(styles, /color: #111827/);
});
