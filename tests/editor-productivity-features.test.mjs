import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath) => readFile(join(root, relativePath), "utf8");

test("edit lock is persistent and enforced in the main process", async () => {
  const service = await source("electron/main/editorProductivityService.ts");
  const main = await source("electron/main/index.ts");
  const preload = await source("electron/preload/index.ts");

  assert.match(service, /editor-productivity\.json/);
  assert.match(service, /ipcMain\.removeHandler\("notes:update"\)/);
  assert.match(service, /Locked notes are read-only/);
  assert.match(service, /notes:deleteToTrash/);
  assert.match(service, /notes:deletePermanent/);
  assert.match(main, /installEditorProductivityService/);
  assert.match(preload, /editorProductivity:getLockedNoteIds/);
  assert.match(preload, /editorProductivity:setLocked/);
});

test("collapsible headings respect divider and heading boundaries", async () => {
  const bootstrap = await source("src/renderer/editorProductivityBootstrap.ts");

  assert.match(bootstrap, /sibling\.tagName === "HR"/);
  assert.match(bootstrap, /siblingLevel <= level/);
  assert.match(bootstrap, /data-nas-collapsed-hidden/);
  assert.match(bootstrap, /collapsedHeadingKeys/);
});

test("fill palette expands to sixteen colors with automatic contrast", async () => {
  const bootstrap = await source("src/renderer/editorProductivityBootstrap.ts");
  const extraSwatches = bootstrap.match(/nameEn: "(?:Slate|Yellow|Sky)"/g) ?? [];

  assert.equal(extraSwatches.length, 3);
  assert.match(bootstrap, /applyAutomaticContrast/);
  assert.match(bootstrap, /whiteContrast >= darkContrast/);
  assert.match(bootstrap, /hiliteColor/);
});

test("renderer installs the editor productivity controller", async () => {
  const entry = await source("src/renderer/main.tsx");
  assert.match(entry, /installEditorProductivityFeatures/);
  assert.match(entry, /installEditorProductivityFeatures\(\)/);
});
