import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
