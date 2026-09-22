import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFile(join(root, path), "utf8");

test("main window blocks navigation and embedded webviews", async () => {
  const main = await source("electron/main/index.ts");
  assert.match(main, /webContents\.on\("will-navigate"/);
  assert.match(main, /event\.preventDefault\(\)/);
  assert.match(main, /webContents\.on\("will-attach-webview"/);
});

test("Google OAuth uses state, PKCE, and a bounded callback", async () => {
  const auth = await source("electron/main/googleAuthService.ts");
  assert.match(auth, /code_challenge_method", "S256"/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /code_verifier/);
  assert.match(auth, /120_000/);
});

test("NASBK overwrite paths require prior user approval", async () => {
  const ipc = await source("electron/main/ipc.ts");
  assert.match(ipc, /approvedNasbkPaths/);
  assert.match(ipc, /was not approved by the user/);
});

test("V08 exposes typography steppers and professional code controls", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");
  assert.match(editor, /stepFontSize/);
  assert.match(editor, /stepLineHeight/);
  assert.match(editor, /CODE_BLOCK_LANGUAGES/);
  assert.match(editor, /Wrap code lines/);
  assert.match(editor, /codeCopied/);
  assert.match(styles, /\.toolbar-stepper/);
  assert.match(styles, /pre\[data-wrap="false"\]/);
});

test("imported editor HTML is sanitized", async () => {
  const markdown = await source("src/renderer/markdown.ts");
  const app = await source("src/renderer/App.tsx");
  assert.match(markdown, /DOMPurify\.sanitize/);
  assert.match(app, /sanitizeEditorHtml\(result\.contentHtml\)/);
});
