import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath) => readFile(join(root, relativePath), "utf8");
const colors = [
  "light-gray", "light-blue", "light-green", "light-amber", "light-rose",
  "slate", "red", "orange", "yellow", "lime", "teal", "cyan", "sky",
  "indigo", "purple", "pink",
];

test("code block picker exposes sixteen colors plus Default", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const start = editor.indexOf("function CodeBlockColorPicker");
  const end = editor.indexOf("interface QuickCopyState", start);
  const picker = editor.slice(start, end);

  assert.ok(picker.includes('value: "default"'));
  for (const color of colors) {
    assert.ok(picker.includes(`value: "${color}"`), `Missing Code Block color: ${color}`);
  }
});

test("code block colors persist and have readable styles", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");

  for (const color of colors) {
    assert.ok(editor.includes(`"${color}"`), `Missing color enum value: ${color}`);
    assert.ok(styles.includes(`data-box-color="${color}"`), `Missing color style: ${color}`);
  }

  assert.ok(styles.includes("grid-template-columns: repeat(4, 1fr)"));
  assert.ok(styles.includes('pre[data-box-color] code'));
  assert.ok(styles.includes("color: inherit"));
});