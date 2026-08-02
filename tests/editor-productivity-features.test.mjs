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
  const collapse = await source("src/renderer/extensions/CollapsibleSections.ts");

  assert.match(collapse, /candidate\.node\.type\.name === "horizontalRule"/);
  assert.match(collapse, /candidateLevel <= headingLevel/);
  assert.match(collapse, /"data-nas-collapsed-hidden": "true"/);
  assert.match(collapse, /collapsedPositions/);
  assert.match(collapse, /Decoration\.node/);
  assert.match(editor, /resetCollapsibleSections\(editor\)/);
  assert.match(editor, /nas-collapse-toggle/);
});

test("collapsible headings remain stable while the editor is unlocked", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const collapse = await source("src/renderer/extensions/CollapsibleSections.ts");
  const styles = await source("src/renderer/styles/editor-productivity.css");

  assert.match(editor, /CollapsibleSections/);
  assert.doesNotMatch(editor, /dataset\.nasCollapsible\s*=/);
  assert.match(collapse, /transaction\.mapping\.mapResult\(position, 1\)/);
  assert.match(collapse, /TextSelection\.near\(view\.state\.doc\.resolve\(position \+ 1\), 1\)/);
  assert.match(collapse, /event\.stopPropagation\(\)/);
  assert.match(collapse, /handleDOMEvents/);
  assert.match(collapse, /window\.requestAnimationFrame\(\(\) => restoreHeadingAnchor/);
  assert.match(styles, /width:\s*10px;[\s\S]*height:\s*10px;/);
  assert.match(styles, /rotate\(45deg\)/);
  assert.match(styles, /:dir\(ltr\)\[data-nas-collapsed="true"\][\s\S]*rotate\(-45deg\)/);
  assert.match(styles, /:dir\(rtl\)\[data-nas-collapsed="true"\][\s\S]*rotate\(135deg\)/);
});

test("visually formatted paragraphs can become collapsible sections", async () => {
  const collapse = await source("src/renderer/extensions/CollapsibleSections.ts");
  const styles = await source("src/renderer/styles/editor-productivity.css");

  assert.match(collapse, /largeTextRatio >= 0\.8 && strongTextRatio >= 0\.8/);
  assert.match(collapse, /manualHeadingPositions/);
  assert.match(collapse, /manual: node\?\.type\.name === "paragraph"/);
  assert.match(collapse, /closest<HTMLElement>\("\[data-nas-collapsible=\\"true\\"\]"\)/);
  assert.match(styles, /\[data-nas-collapsible="true"\]\s*\{\s*position: relative;/);
});

test("fill palette expands to sixteen colors with automatic contrast", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const additionsStart = editor.indexOf("const FILL_SWATCH_ADDITIONS");
  const additionsEnd = editor.indexOf("] as const;", additionsStart);
  const additions = editor.slice(additionsStart, additionsEnd);
  const extraSwatches = additions.match(/name: "(?:Slate|Yellow|Sky)"/g) ?? [];

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

test("fresh installs expose a focused core toolbar while advanced tools remain customizable", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  assert.match(editor, /fontFamily: false/);
  assert.match(editor, /codeBlock: false/);
  assert.match(editor, /horizontalRule: false/);
  assert.match(editor, /table: false/);
  assert.match(editor, /bold: true/);
  assert.match(editor, /numbered: true/);
  assert.match(editor, /nas-notesbook\.editor\.visibleTools/);
});

test("editor note actions cannot inherit the hidden note-card action styles", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");

  assert.match(editor, /className="toolbar-group editor-note-actions"/);
  assert.doesNotMatch(editor, /className="toolbar-group note-actions"/);
  assert.match(styles, /\.editor-note-actions\s*\{\s*gap: 10px;/);
});

test("release V07 is consistent across app metadata and Windows installer naming", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const main = await source("electron/main/index.ts");
  const workflow = await source(".github/workflows/windows-release.yml");

  assert.equal(packageJson.version, "7.0.0");
  assert.equal(packageJson.releaseLabel, "V07");
  assert.equal(packageJson.build.win.artifactName, "NASbook-Setup-V07.exe");
  assert.equal(packageJson.build.nsis.artifactName, "NASbook-Setup-V07.${ext}");
  assert.match(main, /appVersion: "V07"/);
  assert.match(workflow, /NASbook-Setup-\$label\.exe/);
});
