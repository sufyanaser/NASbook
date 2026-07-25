import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("package scripts cover phase 1 verification", async () => {
  const packageJson = JSON.parse(
    await readFile(join(projectRoot, "package.json"), "utf8"),
  );

  for (const script of ["lint", "typecheck", "test", "build", "dev"]) {
    assert.equal(typeof packageJson.scripts[script], "string");
  }
});

test("renderer declares the required placeholder categories", async () => {
  const categoriesSource = await readFile(
    join(projectRoot, "src/shared/categories.ts"),
    "utf8",
  );

  for (const label of [
    "All Notes",
    "Prompts",
    "ChatGPT Instructions",
    "NAS Projects",
    "PowerShell Commands",
    "Development Notes",
    "Errors & Fixes",
    "Templates",
    "Archive",
    "Trash",
  ]) {
    assert.match(categoriesSource, new RegExp(label.replace("&", "\\&")));
  }
});

test("electron main process keeps renderer security enabled", async () => {
  const mainSource = await readFile(
    join(projectRoot, "electron/main/index.ts"),
    "utf8",
  );

  assert.match(mainSource, /contextIsolation:\s*true/);
  assert.match(mainSource, /nodeIntegration:\s*false/);
  assert.match(mainSource, /sandbox:\s*true/);
  assert.match(mainSource, /assets\/icon\.ico/);
});

test("window close waits for the renderer save handshake", async () => {
  const mainSource = await readFile(
    join(projectRoot, "electron/main/index.ts"),
    "utf8",
  );
  const ipcSource = await readFile(
    join(projectRoot, "electron/main/ipc.ts"),
    "utf8",
  );
  const preloadSource = await readFile(
    join(projectRoot, "electron/preload/index.ts"),
    "utf8",
  );
  const rendererSource = await readFile(
    join(projectRoot, "src/renderer/App.tsx"),
    "utf8",
  );

  assert.match(mainSource, /event\.preventDefault\(\)/);
  assert.match(mainSource, /window:close-requested/);
  assert.match(ipcSource, /window:confirmClose/);
  assert.match(preloadSource, /onCloseRequested/);
  assert.match(rendererSource, /flushSaveBeforeClose/);
  assert.doesNotMatch(rendererSource, /addEventListener\("beforeunload"/);
});

test("database validates integrity and creates bounded snapshots", async () => {
  const databaseSource = await readFile(
    join(projectRoot, "electron/main/db.ts"),
    "utf8",
  );

  assert.match(databaseSource, /pragma\("integrity_check"\)/);
  assert.match(databaseSource, /wal_checkpoint\(TRUNCATE\)/);
  assert.match(databaseSource, /database-backups/);
  assert.match(databaseSource, /DATABASE_BACKUP_LIMIT\s*=\s*7/);
  assert.match(databaseSource, /copyFileSync\(databasePath, backupPath\)/);
  assert.match(databaseSource, /if \(isClosed\)/);
});

test("renderer defines reusable CSS tooltip system", async () => {
  const stylesSource = await readFile(
    join(projectRoot, "src/renderer/styles/index.css"),
    "utf8",
  );
  const railSource = await readFile(
    join(projectRoot, "src/renderer/components/NavigationRail.tsx"),
    "utf8",
  );
  const editorSource = await readFile(
    join(projectRoot, "src/renderer/components/NoteEditorArea.tsx"),
    "utf8",
  );
  const settingsSource = await readFile(
    join(projectRoot, "src/renderer/components/SettingsPanel.tsx"),
    "utf8",
  );

  for (const token of [
    "--tooltip-bg",
    "--tooltip-color",
    "--tooltip-border",
    "--tooltip-shadow",
  ]) {
    assert.match(stylesSource, new RegExp(token));
  }

  assert.match(stylesSource, /\[data-tooltip\]:not\(\[data-tooltip=""\]\)::before/);
  assert.match(stylesSource, /focus-visible::before/);
  assert.match(stylesSource, /pointer-events:\s*none/);
  assert.match(stylesSource, /data-tooltip-placement="right"/);
  assert.match(railSource, /data-tooltip-placement="right"/);
  assert.match(editorSource, /data-tooltip=\{t\("tooltipSave",\s*language\)\}/);
  assert.match(settingsSource, /data-tooltip=\{t\("settingsClose",\s*lang\)\}/);
});

test("table resizing transfers width between adjacent columns only", async () => {
  const resizeSource = await readFile(
    join(projectRoot, "src/renderer/extensions/CustomTableResize.ts"),
    "utf8",
  );
  const editorSource = await readFile(
    join(projectRoot, "src/renderer/components/NoteEditorArea.tsx"),
    "utf8",
  );
  const stylesSource = await readFile(
    join(projectRoot, "src/renderer/styles/index.css"),
    "utf8",
  );

  assert.match(resizeSource, /export function transferColumnResizeDelta/);
  assert.match(resizeSource, /nextWidths\[physicalLeftCol\]\s*=\s*leftStart \+ clampedDelta/);
  assert.match(resizeSource, /nextWidths\[physicalRightCol\]\s*=\s*rightStart - clampedDelta/);
  assert.match(resizeSource, /roundColumnWidthsPreservingTotal/);
  assert.match(resizeSource, /direction === "rtl" \? handleCol - 1 : handleCol \+ 1/);
  assert.match(editorSource, /customColumnResizing\(/);
  assert.match(editorSource, /lastColumnResizable:\s*false/);
  assert.match(stylesSource, /\.ProseMirror \.tableWrapper \{\s*overflow:\s*hidden !important;/);
  assert.match(stylesSource, /\.ProseMirror table \{[^}]*width:\s*100% !important;[^}]*min-width:\s*0 !important;[^}]*max-width:\s*100% !important;/s);
});


test("category customization persists names and built-in icons", async () => {
  const dbSource = await readFile(join(projectRoot, "electron/main/db.ts"), "utf8");
  const ipcSource = await readFile(join(projectRoot, "electron/main/ipc.ts"), "utf8");
  const preloadSource = await readFile(join(projectRoot, "electron/preload/index.ts"), "utf8");
  const railSource = await readFile(join(projectRoot, "src/renderer/components/NavigationRail.tsx"), "utf8");
  const dialogSource = await readFile(join(projectRoot, "src/renderer/components/CategoryCustomizationDialog.tsx"), "utf8");

  assert.match(dbSource, /updateCategory:/);
  assert.ok(dbSource.includes("UPDATE categories SET name = ?, icon = ?"));
  assert.match(ipcSource, /categories:update/);
  assert.match(preloadSource, /categories:update/);
  assert.match(railSource, /CategoryCustomizationDialog/);
  assert.match(railSource, /rail-category-edit/);
  assert.match(dialogSource, /categoryIconChoices/);
});

test("category icon catalog exposes 24 packaged Electron-safe icons", async () => {
  const catalogSource = await readFile(
    join(projectRoot, "src/shared/categoryIcons.ts"),
    "utf8",
  );
  const dialogSource = await readFile(
    join(projectRoot, "src/renderer/components/CategoryCustomizationDialog.tsx"),
    "utf8",
  );
  const iconEntries = catalogSource.match(/\{ key: /g) ?? [];

  assert.equal(iconEntries.length, 24);
  assert.match(dialogSource, /function InlineCategoryIcon/);
  assert.match(dialogSource, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(dialogSource, /category-customization-icon-mask/);

  for (const fileName of [
    "star.svg",
    "bookmark.svg",
    "briefcase.svg",
    "calendar.svg",
    "microphone.svg",
    "radio.svg",
    "music.svg",
    "image.svg",
    "database.svg",
    "cloud.svg",
    "shield.svg",
    "rocket.svg",
    "target.svg",
    "palette.svg",
    "lightbulb.svg",
    "archive-box.svg",
  ]) {
    await access(join(projectRoot, "public/category-icons/adaptive", fileName));
    await access(join(projectRoot, "public/category-icons/colored", fileName));
  }
});
