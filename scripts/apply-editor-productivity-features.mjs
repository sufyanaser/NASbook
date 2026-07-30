import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function file(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return readFileSync(file(relativePath), "utf8");
}

function write(relativePath, content) {
  mkdirSync(path.dirname(file(relativePath)), { recursive: true });
  writeFileSync(file(relativePath), content, "utf8");
}

function replaceOnce(relativePath, before, after) {
  const source = read(relativePath);
  const first = source.indexOf(before);
  if (first < 0) {
    throw new Error(`Patch anchor not found in ${relativePath}: ${before.slice(0, 120)}`);
  }
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch anchor is not unique in ${relativePath}: ${before.slice(0, 120)}`);
  }
  write(relativePath, source.slice(0, first) + after + source.slice(first + before.length));
}

function replaceAllChecked(relativePath, before, after, minimumCount = 1) {
  const source = read(relativePath);
  const count = source.split(before).length - 1;
  if (count < minimumCount) {
    throw new Error(`Expected at least ${minimumCount} matches in ${relativePath}, found ${count}: ${before}`);
  }
  write(relativePath, source.split(before).join(after));
}

function replaceBetween(relativePath, startMarker, endMarker, replacement) {
  const source = read(relativePath);
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Range anchors not found in ${relativePath}`);
  }
  write(relativePath, source.slice(0, start) + replacement + source.slice(end));
}

function assertAbsent(relativePath) {
  if (existsSync(file(relativePath))) {
    throw new Error(`Refusing to overwrite existing file: ${relativePath}`);
  }
}

// ---------------------------------------------------------------------------
// Shared models and IPC
// ---------------------------------------------------------------------------
replaceOnce(
  "src/shared/ipc.ts",
  "  readonly isRtl: boolean;\n  readonly createdAt: string;",
  "  readonly isRtl: boolean;\n  readonly isLocked: boolean;\n  readonly createdAt: string;",
);

replaceOnce(
  "src/shared/ipc.ts",
  "export interface UpdateCategoryInput {",
  `export interface SetNoteLockedInput {\n  readonly id: number;\n  readonly isLocked: boolean;\n}\n\nexport interface UpdateCategoryInput {`,
);

replaceOnce(
  "src/shared/ipc.ts",
  "    readonly update: (input: UpdateNoteInput) => Promise<NoteRecord>;\n    readonly deleteToTrash:",
  "    readonly update: (input: UpdateNoteInput) => Promise<NoteRecord>;\n    readonly setLocked: (input: SetNoteLockedInput) => Promise<NoteRecord>;\n    readonly deleteToTrash:",
);

replaceOnce(
  "electron/preload/index.ts",
  "  UpdateNoteInput,\n  UpdateCategoryInput,",
  "  UpdateNoteInput,\n  SetNoteLockedInput,\n  UpdateCategoryInput,",
);

replaceOnce(
  "electron/preload/index.ts",
  "    update: (input: UpdateNoteInput) =>\n      ipcRenderer.invoke(\"notes:update\", input),\n    deleteToTrash:",
  "    update: (input: UpdateNoteInput) =>\n      ipcRenderer.invoke(\"notes:update\", input),\n    setLocked: (input: SetNoteLockedInput) =>\n      ipcRenderer.invoke(\"notes:setLocked\", input),\n    deleteToTrash:",
);

replaceOnce(
  "electron/main/ipc.ts",
  "  UpdateNoteInput,\n  UpdateCategoryInput,",
  "  UpdateNoteInput,\n  SetNoteLockedInput,\n  UpdateCategoryInput,",
);

replaceOnce(
  "electron/main/ipc.ts",
  "  ipcMain.handle(\"notes:deleteToTrash\", (_event, id: number) => {",
  `  ipcMain.handle("notes:setLocked", (_event, input: SetNoteLockedInput) => {\n    return database.setNoteLocked(input);\n  });\n\n  ipcMain.handle("notes:deleteToTrash", (_event, id: number) => {`,
);

// ---------------------------------------------------------------------------
// SQLite persistence and lock enforcement
// ---------------------------------------------------------------------------
replaceOnce(
  "electron/main/schema.ts",
  "    is_rtl INTEGER NOT NULL DEFAULT 1 CHECK (is_rtl IN (0, 1)),\n    created_at",
  "    is_rtl INTEGER NOT NULL DEFAULT 1 CHECK (is_rtl IN (0, 1)),\n    is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),\n    created_at",
);

replaceOnce(
  "electron/main/db.ts",
  "  UpdateNoteInput,\n  UpdateCategoryInput,",
  "  UpdateNoteInput,\n  SetNoteLockedInput,\n  UpdateCategoryInput,",
);

replaceOnce(
  "electron/main/db.ts",
  "  readonly is_rtl: 0 | 1;\n  readonly created_at:",
  "  readonly is_rtl: 0 | 1;\n  readonly is_locked: 0 | 1;\n  readonly created_at:",
);

replaceOnce(
  "electron/main/db.ts",
  "interface IntegrityCheckRow {\n  readonly integrity_check: string;\n}",
  `interface IntegrityCheckRow {\n  readonly integrity_check: string;\n}\n\ninterface TableInfoRow {\n  readonly name: string;\n}`,
);

replaceOnce(
  "electron/main/db.ts",
  "  readonly updateNote: (input: UpdateNoteInput) => NoteRecord;\n  readonly deleteNoteToTrash:",
  "  readonly updateNote: (input: UpdateNoteInput) => NoteRecord;\n  readonly setNoteLocked: (input: SetNoteLockedInput) => NoteRecord;\n  readonly deleteNoteToTrash:",
);

replaceAllChecked(
  "electron/main/db.ts",
  "category_id, is_rtl,\n",
  "category_id, is_rtl, is_locked,\n",
  2,
);

replaceOnce(
  "electron/main/db.ts",
  "    isRtl: row.is_rtl === 1,\n    createdAt:",
  "    isRtl: row.is_rtl === 1,\n    isLocked: row.is_locked === 1,\n    createdAt:",
);

replaceOnce(
  "electron/main/db.ts",
  "function ensureDatabaseReady(database: SqliteDatabase): void {",
  `function ensureNoteLockColumn(database: SqliteDatabase): void {\n  const columns = database.pragma("table_info(notes)") as TableInfoRow[];\n  if (columns.some((column) => column.name === "is_locked")) {\n    return;\n  }\n\n  database\n    .prepare(\n      "ALTER TABLE notes ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1))",\n    )\n    .run();\n}\n\nfunction ensureDatabaseReady(database: SqliteDatabase): void {`,
);

replaceOnce(
  "electron/main/db.ts",
  "  for (const statement of schemaStatements) {\n    database.prepare(statement).run();\n  }\n\n  applyInitialMigration(database);",
  "  for (const statement of schemaStatements) {\n    database.prepare(statement).run();\n  }\n\n  ensureNoteLockColumn(database);\n  applyInitialMigration(database);",
);

replaceOnce(
  "electron/main/db.ts",
  "    updateNote: (input) => {\n      const id = normalizeId(input.id);",
  `    updateNote: (input) => {\n      const id = normalizeId(input.id);\n      const current = requireNote(database, id);\n      if (current.isLocked) {\n        throw new Error("Locked notes are read-only. Unlock the note before editing.");\n      }`,
);

replaceOnce(
  "electron/main/db.ts",
  "    deleteNoteToTrash: (id) => {",
  `    setNoteLocked: (input) => {\n      const id = normalizeId(input.id);\n      database\n        .prepare(\n          \`UPDATE notes\n           SET is_locked = ?,\n               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')\n           WHERE id = ?\`,\n        )\n        .run(input.isLocked ? 1 : 0, id);\n\n      return requireNote(database, id);\n    },\n    deleteNoteToTrash: (id) => {\n      const note = requireNote(database, normalizeId(id));\n      if (note.isLocked) {\n        throw new Error("Locked notes cannot be moved to Trash.");\n      }`,
);

replaceOnce(
  "electron/main/db.ts",
  "    deleteNotePermanent: (id) => {\n      database",
  `    deleteNotePermanent: (id) => {\n      const note = requireNote(database, normalizeId(id));\n      if (note.isLocked) {\n        throw new Error("Locked notes cannot be permanently deleted.");\n      }\n      database`,
);

// ---------------------------------------------------------------------------
// Smart fill contrast
// ---------------------------------------------------------------------------
write(
  "src/renderer/extensions/BackgroundColor.ts",
  `import { Extension } from "@tiptap/core";\nimport "@tiptap/extension-text-style";\n\ndeclare module "@tiptap/core" {\n  interface Commands<ReturnType> {\n    backgroundColor: {\n      setBackgroundColor: (color: string) => ReturnType;\n      unsetBackgroundColor: () => ReturnType;\n    };\n  }\n}\n\nfunction normalizeHex(color: string): string | null {\n  const trimmed = color.trim();\n  const short = /^#([0-9a-f]{3})$/iu.exec(trimmed);\n  if (short) {\n    return \`#\${short[1]\n      .split("")\n      .map((character) => character + character)\n      .join("")}\`;\n  }\n\n  const full = /^#([0-9a-f]{6})$/iu.exec(trimmed);\n  return full ? \`#\${full[1]}\` : null;\n}\n\nfunction channelToLinear(channel: number): number {\n  const normalized = channel / 255;\n  return normalized <= 0.04045\n    ? normalized / 12.92\n    : ((normalized + 0.055) / 1.055) ** 2.4;\n}\n\nexport function getReadableTextColor(backgroundColor: string): "#111827" | "#ffffff" {\n  const hex = normalizeHex(backgroundColor);\n  if (!hex) {\n    return "#111827";\n  }\n\n  const red = Number.parseInt(hex.slice(1, 3), 16);\n  const green = Number.parseInt(hex.slice(3, 5), 16);\n  const blue = Number.parseInt(hex.slice(5, 7), 16);\n  const luminance =\n    0.2126 * channelToLinear(red) +\n    0.7152 * channelToLinear(green) +\n    0.0722 * channelToLinear(blue);\n  const whiteContrast = 1.05 / (luminance + 0.05);\n  const darkContrast = (luminance + 0.05) / 0.057;\n\n  return whiteContrast >= darkContrast ? "#ffffff" : "#111827";\n}\n\nexport const BackgroundColor = Extension.create({\n  name: "backgroundColor",\n\n  addOptions() {\n    return { types: ["textStyle"] };\n  },\n\n  addGlobalAttributes() {\n    return [\n      {\n        types: this.options.types,\n        attributes: {\n          backgroundColor: {\n            default: null,\n            parseHTML: (element) =>\n              element.style.backgroundColor?.replace(/['\"]+/gu, "") || null,\n            renderHTML: (attributes) =>\n              attributes.backgroundColor\n                ? { style: \`background-color: \${attributes.backgroundColor}\` }\n                : {},\n          },\n          autoContrast: {\n            default: false,\n            parseHTML: (element) => element.getAttribute("data-auto-contrast") === "true",\n            renderHTML: (attributes) =>\n              attributes.autoContrast ? { "data-auto-contrast": "true" } : {},\n          },\n        },\n      },\n    ];\n  },\n\n  addCommands() {\n    return {\n      setBackgroundColor:\n        (color: string) =>\n        ({ chain }) =>\n          chain()\n            .setMark("textStyle", {\n              backgroundColor: color,\n              color: getReadableTextColor(color),\n              autoContrast: true,\n            })\n            .run(),\n      unsetBackgroundColor:\n        () =>\n        ({ editor, chain }) => {\n          const attributes = editor.getAttributes("textStyle");\n          return chain()\n            .setMark("textStyle", {\n              backgroundColor: null,\n              color: attributes.autoContrast ? null : attributes.color,\n              autoContrast: false,\n            })\n            .removeEmptyTextStyle()\n            .run();\n        },\n    };\n  },\n});\n`,
);

// ---------------------------------------------------------------------------
// Collapsible heading sections. Horizontal rules are hard section boundaries.
// ---------------------------------------------------------------------------
assertAbsent("src/renderer/extensions/CollapsibleHeadings.ts");
write(
  "src/renderer/extensions/CollapsibleHeadings.ts",
  `import { Extension } from "@tiptap/core";\nimport type { Node as ProseMirrorNode } from "@tiptap/pm/model";\nimport { Plugin, PluginKey } from "@tiptap/pm/state";\nimport { Decoration, DecorationSet } from "@tiptap/pm/view";\n\nconst pluginKey = new PluginKey<ReadonlySet<number>>("nasbookCollapsibleHeadings");\n\ninterface ToggleMeta {\n  readonly type: "toggle";\n  readonly position: number;\n}\n\nfunction getHeadingLevel(node: ProseMirrorNode): number | null {\n  if (node.type.name !== "heading") {\n    return null;\n  }\n  const level = Number(node.attrs.level);\n  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : null;\n}\n\nfunction getSectionBlocks(\n  doc: ProseMirrorNode,\n  headingPosition: number,\n  headingLevel: number,\n): readonly { readonly from: number; readonly to: number }[] {\n  const blocks: { from: number; to: number }[] = [];\n  let boundaryReached = false;\n\n  doc.forEach((node, position) => {\n    if (position <= headingPosition || boundaryReached) {\n      return;\n    }\n\n    const nextHeadingLevel = getHeadingLevel(node);\n    if (node.type.name === "horizontalRule" || (nextHeadingLevel !== null && nextHeadingLevel <= headingLevel)) {\n      boundaryReached = true;\n      return;\n    }\n\n    blocks.push({ from: position, to: position + node.nodeSize });\n  });\n\n  return blocks;\n}\n\nfunction buildDecorations(\n  doc: ProseMirrorNode,\n  collapsedPositions: ReadonlySet<number>,\n): DecorationSet {\n  const decorations: Decoration[] = [];\n\n  doc.forEach((node, position) => {\n    const headingLevel = getHeadingLevel(node);\n    if (headingLevel === null) {\n      return;\n    }\n\n    const sectionBlocks = getSectionBlocks(doc, position, headingLevel);\n    if (sectionBlocks.length === 0) {\n      return;\n    }\n\n    const collapsed = collapsedPositions.has(position);\n    decorations.push(\n      Decoration.node(position, position + node.nodeSize, {\n        class: collapsed ? "nas-collapsible-heading nas-heading-collapsed" : "nas-collapsible-heading",\n        "data-collapsed": collapsed ? "true" : "false",\n      }),\n    );\n\n    decorations.push(\n      Decoration.widget(\n        position + 1,\n        (view) => {\n          const button = document.createElement("button");\n          button.type = "button";\n          button.className = "nas-heading-collapse-toggle";\n          button.contentEditable = "false";\n          button.setAttribute("aria-expanded", collapsed ? "false" : "true");\n          button.setAttribute("aria-label", collapsed ? "توسيع القسم / Expand section" : "طي القسم / Collapse section");\n          button.title = collapsed ? "توسيع القسم / Expand section" : "طي القسم / Collapse section";\n          button.dataset.collapsed = collapsed ? "true" : "false";\n          button.addEventListener("mousedown", (event) => {\n            event.preventDefault();\n            event.stopPropagation();\n            const transaction = view.state.tr.setMeta(pluginKey, {\n              type: "toggle",\n              position,\n            } satisfies ToggleMeta);\n            view.dispatch(transaction);\n          });\n          return button;\n        },\n        { key: \`nas-heading-toggle-\${position}\`, side: -1 },\n      ),\n    );\n\n    if (collapsed) {\n      for (const block of sectionBlocks) {\n        decorations.push(\n          Decoration.node(block.from, block.to, {\n            class: "nas-collapsed-section-block",\n            "aria-hidden": "true",\n          }),\n        );\n      }\n    }\n  });\n\n  return DecorationSet.create(doc, decorations);\n}\n\nexport const CollapsibleHeadings = Extension.create({\n  name: "collapsibleHeadings",\n\n  addProseMirrorPlugins() {\n    return [\n      new Plugin<ReadonlySet<number>>({\n        key: pluginKey,\n        state: {\n          init: () => new Set<number>(),\n          apply(transaction, previous) {\n            const mapped = new Set<number>();\n            for (const position of previous) {\n              const result = transaction.mapping.mapResult(position);\n              const node = result.deleted ? null : transaction.doc.nodeAt(result.pos);\n              if (node && getHeadingLevel(node) !== null) {\n                mapped.add(result.pos);\n              }\n            }\n\n            const meta = transaction.getMeta(pluginKey) as ToggleMeta | undefined;\n            if (meta?.type === "toggle") {\n              if (mapped.has(meta.position)) {\n                mapped.delete(meta.position);\n              } else if (getHeadingLevel(transaction.doc.nodeAt(meta.position) ?? transaction.doc) !== null) {\n                mapped.add(meta.position);\n              }\n            }\n\n            return mapped;\n          },\n        },\n        props: {\n          decorations(state) {\n            return buildDecorations(state.doc, pluginKey.getState(state) ?? new Set<number>());\n          },\n        },\n      }),\n    ];\n  },\n});\n`,
);

// ---------------------------------------------------------------------------
// Editor UI integration
// ---------------------------------------------------------------------------
replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  'import { BackgroundColor } from "../extensions/BackgroundColor";',
  'import { BackgroundColor, getReadableTextColor } from "../extensions/BackgroundColor";\nimport { CollapsibleHeadings } from "../extensions/CollapsibleHeadings";',
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "  readonly onSave: () => void;\n  readonly onToggleTheme:",
  "  readonly onSave: () => void;\n  readonly onToggleLock: () => void;\n  readonly onToggleTheme:",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  '  | "restore"\n  | "deletePermanent";',
  '  | "restore"\n  | "lock"\n  | "unlock"\n  | "deletePermanent";',
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "      {icon === \"deletePermanent\" && (",
  `      {icon === "lock" && (\n        <>\n          <rect x="5" y="10" width="14" height="10" rx="2" {...strokeProps} />\n          <path d="M8 10V7a4 4 0 0 1 8 0v3" {...strokeProps} />\n        </>\n      )}\n      {icon === "unlock" && (\n        <>\n          <rect x="5" y="10" width="14" height="10" rx="2" {...strokeProps} />\n          <path d="M9 10V7a4 4 0 0 1 7.5-2" {...strokeProps} />\n        </>\n      )}\n      {icon === "deletePermanent" && (`,
);

replaceBetween(
  "src/renderer/components/NoteEditorArea.tsx",
  "// Custom Swatch Color Picker Component",
  "function CodeBlockColorPicker",
  `// Custom Swatch Color Picker Component\nfunction ColorPicker({\n  value,\n  onChange,\n  disabled,\n  tooltip,\n  language,\n  kind = "text",\n}: {\n  readonly value: string | null;\n  readonly onChange: (value: string | null) => void;\n  readonly disabled?: boolean;\n  readonly tooltip?: string;\n  readonly language: AppLanguage;\n  readonly kind?: "text" | "fill";\n}): JSX.Element {\n  const [isOpen, setIsOpen] = useState(false);\n  const containerRef = useRef<HTMLDivElement>(null);\n\n  useEffect(() => {\n    if (!isOpen) return;\n    const handleClickOutside = (event: MouseEvent) => {\n      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {\n        setIsOpen(false);\n      }\n    };\n    const handleKeyDown = (event: KeyboardEvent) => {\n      if (event.key === "Escape") setIsOpen(false);\n    };\n    document.addEventListener("mousedown", handleClickOutside);\n    document.addEventListener("keydown", handleKeyDown);\n    return () => {\n      document.removeEventListener("mousedown", handleClickOutside);\n      document.removeEventListener("keydown", handleKeyDown);\n    };\n  }, [isOpen]);\n\n  const swatches = [\n    { name: "White", value: "#f4f4f5" },\n    { name: "Slate", value: "#475569" },\n    { name: "Gray", value: "#71717a" },\n    { name: "Red", value: "#ef4444" },\n    { name: "Orange", value: "#f97316" },\n    { name: "Amber", value: "#f59e0b" },\n    { name: "Yellow", value: "#eab308" },\n    { name: "Lime", value: "#84cc16" },\n    { name: "Green", value: "#10b981" },\n    { name: "Teal", value: "#14b8a6" },\n    { name: "Cyan", value: "#06b6d4" },\n    { name: "Sky", value: "#0ea5e9" },\n    { name: "Blue", value: "#3b82f6" },\n    { name: "Indigo", value: "#6366f1" },\n    { name: "Purple", value: "#8b5cf6" },\n    { name: "Pink", value: "#ec4899" },\n  ] as const;\n\n  const translatedName = (name: string): string => {\n    if (language !== "ar") return name;\n    const names: Record<string, string> = {\n      Reset: "إعادة تعيين", White: "أبيض", Slate: "أردوازي", Gray: "رمادي",\n      Red: "أحمر", Orange: "برتقالي", Amber: "كهرماني", Yellow: "أصفر",\n      Lime: "ليموني", Green: "أخضر", Teal: "أزرق مخضر", Cyan: "سماوي",\n      Sky: "أزرق سماوي", Blue: "أزرق", Indigo: "نيلي", Purple: "أرجواني", Pink: "وردي",\n    };\n    return names[name] ?? name;\n  };\n\n  return (\n    <div className="custom-dropdown-container" ref={containerRef}>\n      <button\n        aria-expanded={isOpen}\n        className="toolbar-icon-button color-picker-trigger"\n        disabled={disabled}\n        data-tooltip={tooltip}\n        onClick={() => setIsOpen(!isOpen)}\n        type="button"\n      >\n        {kind === "fill" ? (\n          <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">\n            <path d="M19 11 9 1 7.5 2.5l2 2L3 11a2 2 0 0 0 0 2.8L8.2 19a2 2 0 0 0 2.8 0L19 11Z" />\n            <path d="M5 13h12" />\n            <path d="M21 16s2 2.5 2 4a2 2 0 1 1-4 0c0-1.5 2-4 2-4Z" fill="currentColor" />\n          </svg>\n        ) : (\n          <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">\n            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35825 19.5 5.5 20 5.5 20.5C5.5 21.3284 6.17157 22 7 22H12Z" />\n            <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />\n            <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />\n            <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />\n            <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />\n          </svg>\n        )}\n        <span className="color-preview-indicator" style={{ backgroundColor: value || "transparent", border: value ? "1px solid var(--app-border-strong)" : "none" }} />\n      </button>\n      {isOpen && (\n        <div className="color-picker-menu">\n          <button\n            className="color-reset-button"\n            data-tooltip={translatedName("Reset")}\n            onClick={() => { onChange(null); setIsOpen(false); }}\n            type="button"\n          >\n            <span className="reset-color-cross" />\n            <span>{translatedName("Reset")}</span>\n          </button>\n          <div className="color-picker-grid">\n            {swatches.map((swatch) => (\n              <button\n                key={swatch.name}\n                className="color-swatch-button"\n                data-tooltip={translatedName(swatch.name)}\n                data-active={value?.toLowerCase() === swatch.value.toLowerCase() ? "true" : "false"}\n                onClick={() => { onChange(swatch.value); setIsOpen(false); }}\n                style={{ backgroundColor: swatch.value }}\n                type="button"\n              />\n            ))}\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}\n\nfunction CodeBlockColorPicker`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "  onRestore,\n  onSave,\n  onTitleChange,",
  "  onRestore,\n  onSave,\n  onToggleLock,\n  onTitleChange,",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "  const hasSelectedNote = selectedNote !== null;",
  "  const hasSelectedNote = selectedNote !== null;\n  const isEditorReadOnly = isTrashView || selectedNote?.isLocked === true;",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "      CustomHorizontalRule,\n      CustomCodeBlock,",
  "      CustomHorizontalRule,\n      CollapsibleHeadings,\n      CustomCodeBlock,",
);

replaceAllChecked(
  "src/renderer/components/NoteEditorArea.tsx",
  "!hasSelectedNote || isTrashView",
  "!hasSelectedNote || isEditorReadOnly",
  8,
);
replaceAllChecked(
  "src/renderer/components/NoteEditorArea.tsx",
  "if (!editor || isTrashView || !selectedNote)",
  "if (!editor || isEditorReadOnly || !selectedNote)",
  3,
);
replaceAllChecked(
  "src/renderer/components/NoteEditorArea.tsx",
  "disabled={isTrashView}",
  "disabled={isEditorReadOnly}",
  2,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "    if (!editor || isTrashView || !hasSelectedNote) {",
  "    if (!editor || isEditorReadOnly || !hasSelectedNote) {",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "      editor.setEditable(!isTrashView && hasSelectedNote);\n    }\n  }, [editor, isTrashView, hasSelectedNote]);",
  "      editor.setEditable(!isEditorReadOnly && hasSelectedNote);\n    }\n  }, [editor, isEditorReadOnly, hasSelectedNote]);",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "            disabled={!hasSelectedNote || isEditorReadOnly}\n            onChange={(event) => onTitleChange(event.target.value)}",
  "            disabled={!hasSelectedNote || isTrashView}\n            readOnly={selectedNote?.isLocked === true}\n            onChange={(event) => onTitleChange(event.target.value)}",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "      {isTrashView && hasSelectedNote && (\n        <div className=\"editor-trash-banner\">\n          <span>{t(\"trashBanner\", language)}</span>\n        </div>\n      )}",
  `      {isTrashView && hasSelectedNote && (\n        <div className="editor-trash-banner">\n          <span>{t("trashBanner", language)}</span>\n        </div>\n      )}\n\n      {!isTrashView && selectedNote?.isLocked && (\n        <div className="editor-lock-banner">\n          <ToolbarIconSvg icon="lock" />\n          <span>{language === "ar" ? "الملاحظة مقفلة للقراءة والنسخ فقط" : "This note is locked for reading and copying only"}</span>\n        </div>\n      )}`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "                  disabled={!hasSelectedNote}\n                  data-tooltip={t(\"tooltipSave\", language)}",
  "                  disabled={!hasSelectedNote || selectedNote?.isLocked === true}\n                  data-tooltip={t(\"tooltipSave\", language)}",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "              <div className=\"toolbar-divider\" />\n              \n              {/* Group 2: Delete to Trash */}",
  `              <button\n                aria-label={selectedNote?.isLocked ? (language === "ar" ? "فتح التعديل" : "Unlock editing") : (language === "ar" ? "قفل التعديل" : "Lock editing")}\n                className="toolbar-action-button"\n                disabled={!hasSelectedNote}\n                data-active={selectedNote?.isLocked ? "true" : "false"}\n                data-tooltip={selectedNote?.isLocked ? (language === "ar" ? "فتح التعديل" : "Unlock editing") : (language === "ar" ? "قفل التعديل" : "Lock editing")}\n                onClick={onToggleLock}\n                type="button"\n              >\n                <ToolbarIconSvg icon={selectedNote?.isLocked ? "unlock" : "lock"} />\n              </button>\n\n              <div className="toolbar-divider" />\n              \n              {/* Group 2: Delete to Trash */}`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "                disabled={!hasSelectedNote}\n                data-tooltip={t(\"tooltipDeleteToTrash\", language)}",
  "                disabled={!hasSelectedNote || selectedNote?.isLocked === true}\n                data-tooltip={t(\"tooltipDeleteToTrash\", language)}",
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "                          editor.chain().focus().unsetColor().run();\n                        } else {\n                          editor.chain().focus().setColor(val).run();",
  `                          editor.chain().focus().setMark("textStyle", { color: null, autoContrast: false }).removeEmptyTextStyle().run();\n                        } else {\n                          editor.chain().focus().setMark("textStyle", { color: val, autoContrast: false }).run();`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "                          chain.setCellAttribute(\"backgroundColor\", val).run();\n                        } else if (val === null) {",
  `                          chain\n                            .setCellAttribute("backgroundColor", val)\n                            .setCellAttribute("textColor", val ? getReadableTextColor(val) : null)\n                            .run();\n                        } else if (val === null) {`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "const cellBackgroundAttribute = {\n  backgroundColor:",
  "const cellBackgroundAttribute = {\n  backgroundColor:",
);
replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  "  },\n};\n\nconst TableCellWithBg",
  `  },\n  textColor: {\n    default: null as string | null,\n    parseHTML: (element: HTMLElement) => element.style.color || null,\n    renderHTML: (attributes: Record<string, unknown>) => {\n      const color = attributes.textColor as string | null;\n      return color ? { style: \`color: \${color}\` } : {};\n    },\n  },\n};\n\nconst TableCellWithBg`,
);

replaceOnce(
  "src/renderer/components/NoteEditorArea.tsx",
  '          data-readonly={isTrashView ? "true" : "false"}',
  '          data-readonly={isEditorReadOnly ? "true" : "false"}',
);

// ---------------------------------------------------------------------------
// App state and list integration
// ---------------------------------------------------------------------------
replaceOnce(
  "src/renderer/App.tsx",
  "    if (!api || !note || activeCategoryRef.current === \"trash\") {",
  "    if (!api || !note || note.isLocked || activeCategoryRef.current === \"trash\") {",
);

replaceOnce(
  "src/renderer/App.tsx",
  "    if (!selectedNote || activeCategory === \"trash\" || !hasUnsavedChanges) {",
  "    if (!selectedNote || selectedNote.isLocked || activeCategory === \"trash\" || !hasUnsavedChanges) {",
);

replaceAllChecked(
  "src/renderer/App.tsx",
  "selectedNote &&\n        activeCategory !== \"trash\"",
  "selectedNote &&\n        !selectedNote.isLocked &&\n        activeCategory !== \"trash\"",
  4,
);

replaceOnce(
  "src/renderer/App.tsx",
  "  // Cancel a queued autosave for a note before a list action mutates it, so a",
  `  const handleToggleNoteLock = async (): Promise<void> => {\n    const api = window.nasNotesbook;\n    const note = selectedNoteRef.current;\n    if (!api || !note || activeCategoryRef.current === "trash") {\n      return;\n    }\n\n    if (!note.isLocked) {\n      const saved = await flushSave(true);\n      if (!saved) {\n        return;\n      }\n    }\n\n    const updated = await api.notes.setLocked({\n      id: note.id,\n      isLocked: !note.isLocked,\n    });\n    setSelectedNote(updated);\n    setDraftTitle(updated.title);\n    setDraftContent(updated.contentMarkdown);\n    setSaveStatus("Saved");\n    await refreshNotes();\n  };\n\n  // Cancel a queued autosave for a note before a list action mutates it, so a`,
);

replaceOnce(
  "src/renderer/App.tsx",
  "    cancelAutosaveFor(id);\n    await api.notes.deleteToTrash(id);",
  "    const note = await api.notes.getById(id);\n    if (!note || note.isLocked) {\n      return;\n    }\n\n    cancelAutosaveFor(id);\n    await api.notes.deleteToTrash(id);",
);

replaceAllChecked(
  "src/renderer/App.tsx",
  "    if (!base) {\n      return;\n    }",
  "    if (!base || base.isLocked) {\n      return;\n    }",
  2,
);

replaceOnce(
  "src/renderer/App.tsx",
  "    if (!selectedNote || !window.nasNotesbook) {\n      return;\n    }\n\n    await window.nasNotesbook.notes.deleteToTrash(selectedNote.id);",
  "    if (!selectedNote || selectedNote.isLocked || !window.nasNotesbook) {\n      return;\n    }\n\n    await window.nasNotesbook.notes.deleteToTrash(selectedNote.id);",
);

replaceOnce(
  "src/renderer/App.tsx",
  "    if (!selectedNote || !window.nasNotesbook) {\n      return;\n    }\n\n    await window.nasNotesbook.notes.deletePermanent(selectedNote.id);",
  "    if (!selectedNote || selectedNote.isLocked || !window.nasNotesbook) {\n      return;\n    }\n\n    await window.nasNotesbook.notes.deletePermanent(selectedNote.id);",
);

replaceOnce(
  "src/renderer/App.tsx",
  "  const handleDraftTitleChange = (title: string): void => {\n    setDraftTitle(title);",
  "  const handleDraftTitleChange = (title: string): void => {\n    if (selectedNoteRef.current?.isLocked) return;\n    setDraftTitle(title);",
);

replaceOnce(
  "src/renderer/App.tsx",
  "  const handleDraftContentChange = (content: string, text: string): void => {\n    nasDebugLog",
  "  const handleDraftContentChange = (content: string, text: string): void => {\n    if (selectedNoteRef.current?.isLocked) return;\n    nasDebugLog",
);

replaceOnce(
  "src/renderer/App.tsx",
  "        onSave={() => {\n          void handleSaveNote();\n        }}\n        onToggleTheme",
  "        onSave={() => {\n          void handleSaveNote();\n        }}\n        onToggleLock={() => {\n          void handleToggleNoteLock();\n        }}\n        onToggleTheme",
);

// Notes list lock badge and disabled destructive/organizational actions.
replaceOnce(
  "src/renderer/components/NotesListColumn.tsx",
  "function ImportIcon(): JSX.Element {",
  `function LockIndicatorIcon(): JSX.Element {\n  return (\n    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">\n      <rect x="5" y="10" width="14" height="10" rx="2" />\n      <path d="M8 10V7a4 4 0 0 1 8 0v3" />\n    </svg>\n  );\n}\n\nfunction ImportIcon(): JSX.Element {`,
);

replaceOnce(
  "src/renderer/components/NotesListColumn.tsx",
  "  const startRename = (note: NoteListItem): void => {\n    setMovePopoverNoteId(null);",
  "  const startRename = (note: NoteListItem): void => {\n    if (note.isLocked) return;\n    setMovePopoverNoteId(null);",
);

replaceOnce(
  "src/renderer/components/NotesListColumn.tsx",
  "              data-move-open={isMoveOpen ? \"true\" : \"false\"}",
  "              data-move-open={isMoveOpen ? \"true\" : \"false\"}\n              data-locked={note.isLocked ? \"true\" : \"false\"}",
);

replaceOnce(
  "src/renderer/components/NotesListColumn.tsx",
  "                  <h2>{note.title}</h2>",
  `                  <div className="note-card-title-group">\n                    <h2>{note.title}</h2>\n                    {note.isLocked && (\n                      <span\n                        className="note-lock-indicator"\n                        data-tooltip={isArabic ? "مقفلة للقراءة والنسخ" : "Locked for reading and copying"}\n                      >\n                        <LockIndicatorIcon />\n                      </span>\n                    )}\n                  </div>`,
);

replaceAllChecked(
  "src/renderer/components/NotesListColumn.tsx",
  "                    className=\"note-action-button\"",
  "                    className=\"note-action-button\"\n                    disabled={note.isLocked}",
  2,
);
replaceOnce(
  "src/renderer/components/NotesListColumn.tsx",
  "                    className=\"note-action-button note-action-delete\"",
  "                    className=\"note-action-button note-action-delete\"\n                    disabled={note.isLocked}",
);

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------
write(
  "src/renderer/styles/editor-productivity.css",
  `.nas-collapsible-heading {\n  position: relative;\n}\n\n.nas-heading-collapse-toggle {\n  display: inline-grid;\n  width: 22px;\n  height: 22px;\n  place-items: center;\n  margin-inline-end: 6px;\n  border: 0;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--app-accent);\n  cursor: pointer;\n  vertical-align: middle;\n}\n\n.nas-heading-collapse-toggle::before {\n  content: "";\n  width: 0;\n  height: 0;\n  border-top: 5px solid transparent;\n  border-bottom: 5px solid transparent;\n  border-inline-start: 8px solid currentColor;\n  transform: rotate(90deg);\n  transition: transform 0.14s ease;\n}\n\n.nas-heading-collapse-toggle[data-collapsed="true"]::before {\n  transform: rotate(0deg);\n}\n\n.nas-heading-collapse-toggle:hover,\n.nas-heading-collapse-toggle:focus-visible {\n  background: color-mix(in srgb, var(--app-accent) 14%, transparent);\n  outline: none;\n}\n\n.nas-collapsed-section-block {\n  display: none !important;\n}\n\n.editor-lock-banner {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border-bottom: 1px solid color-mix(in srgb, var(--app-accent) 34%, var(--app-border));\n  background: color-mix(in srgb, var(--app-accent) 10%, transparent);\n  padding: 9px 32px;\n  color: var(--app-text-muted);\n  font-size: 12px;\n  font-weight: 650;\n}\n\n.editor-lock-banner svg {\n  width: 15px;\n  height: 15px;\n  color: var(--app-accent);\n}\n\n.note-card-title-group {\n  display: flex;\n  min-width: 0;\n  align-items: center;\n  gap: 6px;\n}\n\n.note-card-title-group h2 {\n  min-width: 0;\n}\n\n.note-lock-indicator {\n  display: inline-grid;\n  flex: 0 0 auto;\n  width: 18px;\n  height: 18px;\n  place-items: center;\n  color: var(--app-accent);\n}\n\n.note-lock-indicator svg {\n  width: 13px;\n  height: 13px;\n}\n\n.note-action-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.35;\n}\n\n.color-reset-button {\n  display: flex !important;\n  width: 100% !important;\n  height: 30px !important;\n  align-items: center !important;\n  justify-content: flex-start !important;\n  gap: 8px !important;\n  margin-bottom: 8px;\n  padding: 0 8px !important;\n  font-size: 11px !important;\n}\n\n.color-reset-button .reset-color-cross {\n  width: 18px;\n  height: 18px;\n}\n\n.note-editor-content-wrapper[data-readonly="true"] .ProseMirror {\n  cursor: text;\n  user-select: text;\n}\n`,
);

replaceOnce(
  "src/renderer/styles/index.css",
  "@tailwind utilities;",
  '@tailwind utilities;\n\n@import "./editor-productivity.css";',
);

// ---------------------------------------------------------------------------
// Regression contracts
// ---------------------------------------------------------------------------
assertAbsent("tests/editor-productivity-features.test.mjs");
write(
  "tests/editor-productivity-features.test.mjs",
  `import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport { join } from "node:path";\nimport test from "node:test";\n\nconst root = process.cwd();\nconst source = (relativePath) => readFile(join(root, relativePath), "utf8");\n\ntest("note lock is persisted and enforced below the renderer", async () => {\n  const schema = await source("electron/main/schema.ts");\n  const database = await source("electron/main/db.ts");\n  const ipc = await source("electron/main/ipc.ts");\n  const preload = await source("electron/preload/index.ts");\n\n  assert.match(schema, /is_locked INTEGER NOT NULL DEFAULT 0/);\n  assert.match(database, /setNoteLocked/);\n  assert.match(database, /Locked notes are read-only/);\n  assert.match(ipc, /notes:setLocked/);\n  assert.match(preload, /notes:setLocked/);\n});\n\ntest("collapsible headings stop at dividers and peer or parent headings", async () => {\n  const extension = await source("src/renderer/extensions/CollapsibleHeadings.ts");\n  const editor = await source("src/renderer/components/NoteEditorArea.tsx");\n\n  assert.match(extension, /horizontalRule/);\n  assert.match(extension, /nextHeadingLevel <= headingLevel/);\n  assert.match(extension, /nas-collapsed-section-block/);\n  assert.match(editor, /CollapsibleHeadings/);\n});\n\ntest("fill palette exposes sixteen colors and automatic contrast", async () => {\n  const editor = await source("src/renderer/components/NoteEditorArea.tsx");\n  const background = await source("src/renderer/extensions/BackgroundColor.ts");\n  const swatchMatches = editor.match(/\{ name: \"(?:White|Slate|Gray|Red|Orange|Amber|Yellow|Lime|Green|Teal|Cyan|Sky|Blue|Indigo|Purple|Pink)\", value:/g) ?? [];\n\n  assert.equal(swatchMatches.length, 16);\n  assert.match(background, /getReadableTextColor/);\n  assert.match(background, /autoContrast: true/);\n  assert.match(editor, /color-reset-button/);\n});\n`,
);

console.log("NASbook editor productivity feature patch applied successfully.");
