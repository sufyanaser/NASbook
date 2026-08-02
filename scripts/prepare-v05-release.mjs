import { readFile, writeFile } from "node:fs/promises";

const editorPath = "src/renderer/components/NoteEditorArea.tsx";
const stylesPath = "src/renderer/styles/index.css";
const codeBlockTestPath = "tests/code-block-palette.test.mjs";
const releaseTestPath = "tests/editor-productivity-features.test.mjs";
const packagePath = "package.json";
const packageLockPath = "package-lock.json";
const mainPath = "electron/main/index.ts";
const readmePath = "README.md";

function replaceOnce(source, search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${occurrences}`);
  }
  return source.replace(search, replacement);
}

let editor = await readFile(editorPath, "utf8");
let styles = await readFile(stylesPath, "utf8");
let releaseTests = await readFile(releaseTestPath, "utf8");
let main = await readFile(mainPath, "utf8");
let readme = await readFile(readmePath, "utf8");

editor = replaceOnce(
  editor,
  `const CODE_BLOCK_BOX_COLORS = [
  "default",
  "light-gray",
  "light-blue",
  "light-green",
  "light-amber",
  "light-rose",
] as const;`,
  `const CODE_BLOCK_BOX_COLORS = [
  "default",
  "light-gray",
  "light-blue",
  "light-green",
  "light-amber",
  "light-rose",
  "slate",
  "red",
  "orange",
  "yellow",
  "lime",
  "teal",
  "cyan",
  "sky",
  "indigo",
  "purple",
  "pink",
] as const;`,
  "code block color enum",
);

editor = replaceOnce(
  editor,
  `  const swatches: {
    readonly name: string;
    readonly value: CodeBlockBoxColor;
    readonly hex: string;
  }[] = [
    { name: "Default", value: "default", hex: "#0f172a" },
    { name: "Light gray", value: "light-gray", hex: "#f3f4f6" },
    { name: "Light blue", value: "light-blue", hex: "#dbeafe" },
    { name: "Light green", value: "light-green", hex: "#dcfce7" },
    { name: "Light amber", value: "light-amber", hex: "#fef3c7" },
    { name: "Light rose", value: "light-rose", hex: "#ffe4e6" },
  ];`,
  `  const swatches: {
    readonly name: string;
    readonly value: CodeBlockBoxColor;
    readonly hex: string;
  }[] = [
    { name: "Default", value: "default", hex: "#0f172a" },
    { name: "Light gray", value: "light-gray", hex: "#f3f4f6" },
    { name: "Light blue", value: "light-blue", hex: "#dbeafe" },
    { name: "Light green", value: "light-green", hex: "#dcfce7" },
    { name: "Light amber", value: "light-amber", hex: "#fef3c7" },
    { name: "Light rose", value: "light-rose", hex: "#ffe4e6" },
    { name: "Slate", value: "slate", hex: "#475569" },
    { name: "Red", value: "red", hex: "#ef4444" },
    { name: "Orange", value: "orange", hex: "#f97316" },
    { name: "Yellow", value: "yellow", hex: "#eab308" },
    { name: "Lime", value: "lime", hex: "#84cc16" },
    { name: "Teal", value: "teal", hex: "#14b8a6" },
    { name: "Cyan", value: "cyan", hex: "#06b6d4" },
    { name: "Sky", value: "sky", hex: "#0ea5e9" },
    { name: "Indigo", value: "indigo", hex: "#6366f1" },
    { name: "Purple", value: "purple", hex: "#8b5cf6" },
    { name: "Pink", value: "pink", hex: "#ec4899" },
  ];`,
  "code block swatches",
);

editor = replaceOnce(
  editor,
  `      case "Light rose": return "وردي فاتح";
      default: return name;`,
  `      case "Light rose": return "وردي فاتح";
      case "Slate": return "أردوازي";
      case "Red": return "أحمر";
      case "Orange": return "برتقالي";
      case "Yellow": return "أصفر";
      case "Lime": return "ليموني";
      case "Teal": return "أزرق مخضر";
      case "Cyan": return "سماوي";
      case "Sky": return "أزرق سماوي";
      case "Indigo": return "نيلي";
      case "Purple": return "أرجواني";
      case "Pink": return "وردي";
      default: return name;`,
  "code block Arabic labels",
);

styles = replaceOnce(
  styles,
  `.code-block-color-grid {
  grid-template-columns: repeat(3, 1fr);
}`,
  `.code-block-color-grid {
  grid-template-columns: repeat(4, 1fr);
}`,
  "code block palette grid",
);

styles += `

/* NASbook V05 16-color code block palette */
.note-editor-content-wrapper .ProseMirror pre[data-box-color="slate"] { border-color: #334155; background: #475569; color: #ffffff; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="red"] { border-color: #dc2626; background: #ef4444; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="orange"] { border-color: #ea580c; background: #f97316; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="yellow"] { border-color: #ca8a04; background: #eab308; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="lime"] { border-color: #65a30d; background: #84cc16; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="teal"] { border-color: #0f766e; background: #14b8a6; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="cyan"] { border-color: #0891b2; background: #06b6d4; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="sky"] { border-color: #0284c7; background: #0ea5e9; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="indigo"] { border-color: #4f46e5; background: #6366f1; color: #ffffff; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="purple"] { border-color: #7c3aed; background: #8b5cf6; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color="pink"] { border-color: #db2777; background: #ec4899; color: #111827; }
.note-editor-content-wrapper .ProseMirror pre[data-box-color] code { color: inherit; }
`;

const codeBlockTest = `import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");
const colors = ["light-gray", "light-blue", "light-green", "light-amber", "light-rose", "slate", "red", "orange", "yellow", "lime", "teal", "cyan", "sky", "indigo", "purple", "pink"];

test("code block picker exposes sixteen colors plus Default", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const start = editor.indexOf("function CodeBlockColorPicker");
  const end = editor.indexOf("interface QuickCopyState", start);
  const picker = editor.slice(start, end);
  assert.match(picker, /value: "default"/);
  for (const color of colors) assert.match(picker, new RegExp('value: "' + color + '"'));
});

test("code block colors persist and have readable styles", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");
  for (const color of colors) {
    assert.match(editor, new RegExp('"' + color + '"'));
    assert.match(styles, new RegExp('data-box-color="' + color + '"'));
  }
  assert.match(styles, /code-block-color-grid\s*\{\s*grid-template-columns: repeat\(4, 1fr\)/);
  assert.match(styles, /pre\[data-box-color\] code\s*\{\s*color: inherit/);
});
`;

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = "5.0.0";
packageJson.releaseLabel = "V05";
packageJson.build.win.artifactName = "NASbook Setup V05.exe";
packageJson.build.nsis.artifactName = "NASbook Setup V05.${ext}";

const packageLock = JSON.parse(await readFile(packageLockPath, "utf8"));
packageLock.version = "5.0.0";
packageLock.packages[""].version = "5.0.0";

main = replaceOnce(main, `appVersion: "V04"`, `appVersion: "V05"`, "main app version");
readme = replaceOnce(readme, `Current release: **V04**`, `Current release: **V05**`, "README release label");
releaseTests = replaceOnce(releaseTests, `release V04 is consistent`, `release V05 is consistent`, "release test title");
releaseTests = releaseTests.replaceAll(`"4.0.0"`, `"5.0.0"`);
releaseTests = releaseTests.replaceAll(`"V04"`, `"V05"`);
releaseTests = releaseTests.replaceAll(`NASbook Setup V04`, `NASbook Setup V05`);

await writeFile(editorPath, editor, "utf8");
await writeFile(stylesPath, styles, "utf8");
await writeFile(codeBlockTestPath, codeBlockTest, "utf8");
await writeFile(releaseTestPath, releaseTests, "utf8");
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
await writeFile(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, "utf8");
await writeFile(mainPath, main, "utf8");
await writeFile(readmePath, readme, "utf8");
