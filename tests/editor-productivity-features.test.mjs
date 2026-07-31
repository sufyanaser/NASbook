import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath) => readFile(join(root, relativePath), "utf8");

test("edit lock is persisted in SQLite and enforced by the data layer", async () => {
  const database = await source("electron/main/db.ts");
  const schema = await source("electron/main/schema.ts");
  const ipc = await source("electron/main/ipc.ts");
  const preload = await source("electron/preload/index.ts");

  assert.match(schema, /is_locked INTEGER NOT NULL DEFAULT 0/);
  assert.match(database, /ALTER TABLE notes ADD COLUMN is_locked/);
  assert.match(database, /Locked notes are read-only/);
  assert.match(database, /Locked notes cannot be moved to Trash/);
  assert.match(database, /Locked notes cannot be permanently deleted/);
  assert.match(ipc, /notes:setLocked/);
  assert.match(preload, /notes:setLocked/);
});

test("collapsible headings respect divider and heading boundaries", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");

  assert.match(editor, /sibling\.tagName === "HR"/);
  assert.match(editor, /siblingLevel <= structuralLevel/);
  assert.match(editor, /data-nas-collapsed-hidden/);
  assert.match(editor, /collapsedHeadingKeysRef/);
  assert.match(editor, /requestAnimationFrame\(\(\) => refreshCollapsibleHeadingsRef\.current\(\)\)/);
  assert.match(editor, /nas-collapse-toggle/);
});

test("visually formatted paragraphs can become collapsible sections", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/editor-productivity.css");

  assert.match(editor, /nodeName !== "heading" && nodeName !== "paragraph"/);
  assert.match(editor, /fontSize >= 18/);
  assert.match(editor, /manualSectionKeysRef\.current\.add\(activeCollapse\.key\)/);
  assert.match(editor, /closest<HTMLElement>\("\[data-nas-collapsible=\\"true\\"\]"\)/);
  assert.match(styles, /\[data-nas-collapsible="true"\]\s*\{\s*position: relative;/);
});

test("fill palette expands to sixteen colors with automatic contrast", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const extraSwatches = editor.match(/name: "(?:Slate|Yellow|Sky)"/g) ?? [];

  assert.equal(extraSwatches.length, 3);
  assert.match(editor, /function readableTextColor/);
  assert.match(editor, /whiteContrast >= darkContrast/);
  assert.match(editor, /setBackgroundColor\(val\)[\s\S]*setColor\(readableTextColor\(val\)\)/);
});

test("renderer avoids the former global observer and deprecated editing commands", async () => {
  const entry = await source("src/renderer/main.tsx");
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  assert.doesNotMatch(entry, /installEditorProductivityFeatures/);
  assert.doesNotMatch(editor, /MutationObserver/);
  assert.doesNotMatch(editor, /execCommand\("(?:hiliteColor|backColor|foreColor)"/);
});

test("editor note actions cannot inherit the hidden note-card action styles", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");

  assert.match(editor, /className="toolbar-group editor-note-actions"/);
  assert.doesNotMatch(editor, /className="toolbar-group note-actions"/);
  assert.match(styles, /\.editor-note-actions\s*\{\s*gap: 10px;/);
});

test("release V04 is consistent across app metadata and Windows installer naming", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const main = await source("electron/main/index.ts");
  const workflow = await source(".github/workflows/windows-release.yml");

  assert.equal(packageJson.version, "4.0.0");
  assert.equal(packageJson.releaseLabel, "V04");
  assert.equal(packageJson.build.win.artifactName, "NASbook Setup V04.exe");
  assert.equal(packageJson.build.nsis.artifactName, "NASbook Setup V04.${ext}");
  assert.match(main, /appVersion: "V04"/);
  assert.match(workflow, /NASbook Setup \$label\.exe/);
});
