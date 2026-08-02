import { readFile, writeFile } from "node:fs/promises";

const editorPath = "src/renderer/components/NoteEditorArea.tsx";
const stylesPath = "src/renderer/styles/index.css";
const testPath = "tests/code-block-palette.test.mjs";

function replaceOnce(source, search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${occurrences}`);
  }
  return source.replace(search, replacement);
}

let editor = await readFile(editorPath, "utf8");
let styles = await readFile(stylesPath, "utf8");

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

const cssMarker = "/* NASbook 16-color code block palette */";
if (styles.includes(cssMarker)) {
  throw new Error("code block palette CSS already exists");
}

styles += `

${cssMarker}
.note-editor-content-wrapper .ProseMirror pre[data-box-color="slate"] {
  border-color: #334155;
  background: #475569;
  color: #ffffff;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="red"] {
  border-color: #dc2626;
  background: #ef4444;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="orange"] {
  border-color: #ea580c;
  background: #f97316;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="yellow"] {
  border-color: #ca8a04;
  background: #eab308;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="lime"] {
  border-color: #65a30d;
  background: #84cc16;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="teal"] {
  border-color: #0f766e;
  background: #14b8a6;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="cyan"] {
  border-color: #0891b2;
  background: #06b6d4;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="sky"] {
  border-color: #0284c7;
  background: #0ea5e9;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="indigo"] {
  border-color: #4f46e5;
  background: #6366f1;
  color: #ffffff;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="purple"] {
  border-color: #7c3aed;
  background: #8b5cf6;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color="pink"] {
  border-color: #db2777;
  background: #ec4899;
  color: #111827;
}

.note-editor-content-wrapper .ProseMirror pre[data-box-color] code {
  color: inherit;
}
`;

const test = `import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

test("code block picker exposes sixteen colors plus a separate default", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const start = editor.indexOf("function CodeBlockColorPicker");
  const end = editor.indexOf("interface QuickCopyState", start);
  const picker = editor.slice(start, end);
  const values = [...picker.matchAll(/value: \"(?:light-gray|light-blue|light-green|light-amber|light-rose|slate|red|orange|yellow|lime|teal|cyan|sky|indigo|purple|pink)\"/g)];

  assert.equal(values.length, 16);
  assert.match(picker, /value: \"default\"/);
  assert.match(picker, /code-block-color-grid/);
});

test("code block color enum and styles cover every palette value", async () => {
  const editor = await source("src/renderer/components/NoteEditorArea.tsx");
  const styles = await source("src/renderer/styles/index.css");
  const values = [
    "light-gray", "light-blue", "light-green", "light-amber", "light-rose",
    "slate", "red", "orange", "yellow", "lime", "teal", "cyan", "sky",
    "indigo", "purple", "pink",
  ];

  for (const value of values) {
    assert.match(editor, new RegExp(\`\\\"\${value}\\\"\`));
    assert.match(styles, new RegExp(\`data-box-color=\\\"\${value}\\\"\`));
  }

  assert.match(styles, /code-block-color-grid\s*\{\s*grid-template-columns: repeat\(4, 1fr\)/);
  assert.match(styles, /pre\[data-box-color\] code\s*\{\s*color: inherit/);
});
`;

await writeFile(editorPath, editor, "utf8");
await writeFile(stylesPath, styles, "utf8");
await writeFile(testPath, test, "utf8");
