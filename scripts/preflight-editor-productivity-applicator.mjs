import { readFileSync, writeFileSync } from "node:fs";

const target = "scripts/apply-editor-productivity-features.mjs";
let source = readFileSync(target, "utf8");

const fixes = [
  [
    "}\\n\\nfunction CodeBlockColorPicker`,\n);",
    "}\\n\\n`,\n);",
  ],
  [
    '  "@tailwind utilities;",\n  \'@tailwind utilities;\\n\\n@import "./editor-productivity.css";\',',
    '  "@tailwind base;",\n  \'@import "./editor-productivity.css";\\n\\n@tailwind base;\',',
  ],
];

for (const [before, after] of fixes) {
  if (!source.includes(before)) {
    throw new Error(`Applicator preflight anchor missing: ${before}`);
  }
  source = source.replace(before, after);
}

writeFileSync(target, source, "utf8");
console.log("Applicator preflight fixes applied.");
