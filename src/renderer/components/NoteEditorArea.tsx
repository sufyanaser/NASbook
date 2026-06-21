import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import CodeBlock from "@tiptap/extension-code-block";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { DOMSerializer } from "@tiptap/pm/model";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../extensions/FontSize";
import { BackgroundColor } from "../extensions/BackgroundColor";
import { LineHeight } from "../extensions/LineHeight";
import { TextDirection } from "../extensions/TextDirection";
import { Indent } from "../extensions/Indent";
import { LinkDialog } from "./LinkDialog";
import { EditorContextMenu } from "./EditorContextMenu";
import type { MenuNode } from "./EditorContextMenu";
import { htmlToMarkdown } from "../markdown";
import type { NoteRecord } from "../../shared/ipc";
import type {
  AppTheme,
  EditorDensity,
  EditorDirection,
  EditorFontSize,
  AppLanguage,
} from "../../shared/settings";
import { t } from "../../shared/i18n";

interface NoteEditorAreaProps {
  readonly activeCategoryName: string;
  readonly draftContent: string;
  readonly draftTitle: string;
  readonly editorDensity: EditorDensity;
  readonly editorDirection: EditorDirection;
  readonly shortcuts: Record<string, string>;
  readonly fontSize: EditorFontSize;
  readonly isTrashView: boolean;
  readonly saveStatus: string;
  readonly selectedNote: NoteRecord | null;
  readonly showMetadata: boolean;
  readonly theme: AppTheme;
  readonly language: AppLanguage;
  readonly onContentChange: (content: string, text: string) => void;
  readonly onDeletePermanent: () => void;
  readonly onDeleteToTrash: () => void;
  readonly onRestore: () => void;
  readonly onSave: () => void;
  readonly onToggleTheme: () => void;
  readonly onThemeChange: (theme: AppTheme) => void;
  readonly onTitleChange: (title: string) => void;
  readonly onExportNote?: () => void;
}

type ToolbarIcon =
  | "bold"
  | "italic"
  | "underline"
  | "codeBlock"
  | "codeBlockColor"
  | "link"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "bullets"
  | "numbered"
  | "clear"
  | "horizontalRule"
  | "table"
  | "undo"
  | "redo"
  | "indentIncrease"
  | "indentDecrease"
  | "dirRtl"
  | "dirLtr"
  | "tableRowAdd"
  | "tableColAdd"
  | "tableRowDelete"
  | "tableColDelete"
  | "tableDelete"
  | "save"
  | "trash"
  | "restore"
  | "deletePermanent";

function ToolbarIconSvg({ icon }: { readonly icon: ToolbarIcon }): JSX.Element {
  if (icon === "bold" || icon === "italic") {
    return (
      <svg
        aria-hidden="true"
        className="toolbar-button-icon"
        viewBox="0 0 24 24"
      >
        <text
          x="12"
          y="17"
          fill="currentColor"
          fontFamily="Georgia, serif"
          fontSize="16"
          fontStyle={icon === "italic" ? "italic" : "normal"}
          fontWeight={icon === "bold" ? "800" : "700"}
          textAnchor="middle"
        >
          {icon === "bold" ? "B" : "I"}
        </text>
      </svg>
    );
  }

  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
  } as const;

  return (
    <svg
      aria-hidden="true"
      className="toolbar-button-icon"
      viewBox="0 0 24 24"
    >
      {icon === "underline" && (
        <path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16" {...strokeProps} />
      )}
      {icon === "codeBlock" && (
        <>
          <path d="m9 18 6-12" {...strokeProps} />
          <path d="m7 8-4 4 4 4M17 8l4 4-4 4" {...strokeProps} />
        </>
      )}
      {icon === "codeBlockColor" && (
        <>
          <path d="M5 5h14v14H5z" {...strokeProps} />
          <path d="M8 15h8" {...strokeProps} />
          <path d="M9 9h6" {...strokeProps} />
        </>
      )}
      {icon === "link" && (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" {...strokeProps} />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" {...strokeProps} />
        </>
      )}
      {icon === "alignLeft" && (
        <path d="M17 6H3M21 12H3M17 18H3" {...strokeProps} />
      )}
      {icon === "alignCenter" && (
        <path d="M19 6H5M21 12H3M19 18H5" {...strokeProps} />
      )}
      {icon === "alignRight" && (
        <path d="M21 6H7M21 12H3M21 18H7" {...strokeProps} />
      )}
      {icon === "indentIncrease" && (
        <>
          <path d="M21 6H10M21 12H10M21 18H10M21 9v6" {...strokeProps} />
          <path d="m3 9 3 3-3 3" {...strokeProps} />
        </>
      )}
      {icon === "indentDecrease" && (
        <>
          <path d="M21 6H10M21 12H10M21 18H10M21 9v6" {...strokeProps} />
          <path d="m6 9-3 3 3 3" {...strokeProps} />
        </>
      )}
      {icon === "dirRtl" && (
        <>
          <path d="M18 12a3.5 3.5 0 0 0 0-7h-5v12" {...strokeProps} />
          <path d="M10 19H3M6 16l-3 3 3 3" {...strokeProps} />
        </>
      )}
      {icon === "dirLtr" && (
        <>
          <path d="M6 12a3.5 3.5 0 0 1 0-7h5v12" {...strokeProps} />
          <path d="M14 19h7M18 16l3 3-3 3" {...strokeProps} />
        </>
      )}
      {icon === "tableRowAdd" && (
        <>
          <rect x="3" y="4" width="18" height="9" rx="1.5" {...strokeProps} />
          <path d="M3 8.5h18" {...strokeProps} />
          <path d="M12 16v6M9 19h6" {...strokeProps} />
        </>
      )}
      {icon === "tableColAdd" && (
        <>
          <rect x="4" y="3" width="9" height="18" rx="1.5" {...strokeProps} />
          <path d="M8.5 3v18" {...strokeProps} />
          <path d="M18 9v6M15 12h6" {...strokeProps} />
        </>
      )}
      {icon === "tableRowDelete" && (
        <>
          <rect x="3" y="4" width="18" height="9" rx="1.5" {...strokeProps} />
          <path d="M3 8.5h18" {...strokeProps} />
          <path d="M9 19h6" {...strokeProps} />
        </>
      )}
      {icon === "tableColDelete" && (
        <>
          <rect x="4" y="3" width="9" height="18" rx="1.5" {...strokeProps} />
          <path d="M8.5 3v18" {...strokeProps} />
          <path d="M15 12h6" {...strokeProps} />
        </>
      )}
      {icon === "tableDelete" && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="1.5" {...strokeProps} />
          <path d="M3 10h18M9 4v16" {...strokeProps} />
          <path d="m14 13 5 5M19 13l-5 5" {...strokeProps} />
        </>
      )}
      {icon === "bullets" && (
        <>
          <circle cx="6" cy="7" r="1.4" fill="currentColor" />
          <circle cx="6" cy="12" r="1.4" fill="currentColor" />
          <circle cx="6" cy="17" r="1.4" fill="currentColor" />
          <path d="M10 7h8M10 12h8M10 17h8" {...strokeProps} />
        </>
      )}
      {icon === "numbered" && (
        <>
          <path d="M5 6h1v4M4.8 10h2.4M4.8 14h2.4l-2.4 4h2.4" {...strokeProps} />
          <path d="M11 7h7M11 12h7M11 17h7" {...strokeProps} />
        </>
      )}
      {icon === "clear" && (
        <>
          <path d="M5 5h10M10 5v14M7 19h6" {...strokeProps} />
          <path d="M15 15l4 4M19 15l-4 4" {...strokeProps} />
        </>
      )}
      {icon === "undo" && (
        <path d="M9 7H5V3M5 7a8 8 0 1 1-2 5.3" {...strokeProps} />
      )}
      {icon === "redo" && (
        <path d="M15 7h4V3M19 7a8 8 0 1 0 2 5.3" {...strokeProps} />
      )}
      {icon === "horizontalRule" && (
        <path d="M4 12h16" {...strokeProps} />
      )}
      {icon === "table" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="1" {...strokeProps} />
          <path d="M4 10h16M4 14.5h16M9.5 5v14M14.5 5v14" {...strokeProps} />
        </>
      )}
      {icon === "save" && (
        <>
          <path d="M5 4h11l3 3v13H5z" {...strokeProps} />
          <path d="M8 4v6h8M8 17h8" {...strokeProps} />
          <path d="m9 13 2 2 4-4" {...strokeProps} />
        </>
      )}
      {icon === "trash" && (
        <path d="M6 7h12M10 7V5h4v2M8 10v9h8v-9M10 12v5M14 12v5" {...strokeProps} />
      )}
      {icon === "restore" && (
        <path d="M9 7H5v-4M5 7a8 8 0 1 1-1 6" {...strokeProps} />
      )}
      {icon === "deletePermanent" && (
        <>
          <path d="M6 7h12M10 7V5h4v2M8 10v9h8v-9" {...strokeProps} />
          <path d="m10 13 4 4M14 13l-4 4" {...strokeProps} />
        </>
      )}
    </svg>
  );
}

const DEFAULT_VISIBLE_TOOLS: Record<string, boolean> = {
  undo: true,
  redo: true,
  fontFamily: true,
  fontSize: true,
  heading: true,
  lineHeight: true,
  bold: true,
  italic: true,
  underline: true,
  textColor: true,
  fillColor: true,
  link: true,
  codeBlock: true,
  bullets: true,
  numbered: true,
  alignLeft: true,
  alignCenter: true,
  alignRight: true,
  dirRtl: true,
  dirLtr: true,
  outdent: true,
  indent: true,
  clear: true,
  horizontalRule: true,
  table: true,
};

// Compact theme selector for the editor header (reuses existing AppTheme settings).
const EDITOR_THEMES: readonly { value: AppTheme; labelEn: string; labelAr: string; colors: readonly string[] }[] = [
  { value: "light", labelEn: "Light", labelAr: "فاتح", colors: ["#f5f5f4", "#ffffff", "#4f46e5"] },
  { value: "dark", labelEn: "Dark", labelAr: "داكن", colors: ["#0c0a09", "#1c1917", "#6366f1"] },
  { value: "graphite", labelEn: "Graphite", labelAr: "غرافيت", colors: ["#101214", "#1b1f23", "#3b82f6"] },
  { value: "material-dark", labelEn: "Material Dark", labelAr: "ماتيريال داكن", colors: ["#121212", "#1e1e1e", "#b39ddb"] },
  { value: "ulysses", labelEn: "Ulysses", labelAr: "يوليسيس", colors: ["#f8f5ee", "#fffdf7", "#d84b20"] },
  { value: "one-dark", labelEn: "One Dark", labelAr: "ون دارك", colors: ["#1e2127", "#282c34", "#61afef"] },
];

// Grouping for the toolbar-customization popover (Text / Blocks / Insert / Advanced).
const TOOL_GROUPS: readonly { id: string; labelEn: string; labelAr: string; tools: readonly string[] }[] = [
  { id: "text", labelEn: "Text", labelAr: "النص", tools: ["fontFamily", "fontSize", "heading", "lineHeight", "bold", "italic", "underline", "textColor", "fillColor"] },
  { id: "blocks", labelEn: "Blocks", labelAr: "الكتل", tools: ["bullets", "numbered", "alignLeft", "alignCenter", "alignRight", "dirRtl", "dirLtr", "outdent", "indent", "codeBlock", "clear"] },
  { id: "insert", labelEn: "Insert", labelAr: "إدراج", tools: ["link", "horizontalRule", "table"] },
  { id: "advanced", labelEn: "Advanced", labelAr: "متقدم", tools: ["undo", "redo"] },
];

function toolLabel(toolId: string, language: AppLanguage): string {
  const ar = language === "ar";
  switch (toolId) {
    case "fontFamily": return ar ? "نوع الخط" : "Font Family";
    case "fontSize": return ar ? "حجم الخط" : "Font Size";
    case "heading": return ar ? "العناوين" : "Headings";
    case "lineHeight": return ar ? "تباعد الأسطر" : "Line Height";
    case "bold": return ar ? "عريض" : "Bold";
    case "italic": return ar ? "مائل" : "Italic";
    case "underline": return ar ? "تحته خط" : "Underline";
    case "textColor": return ar ? "لون النص" : "Text Color";
    case "fillColor": return ar ? "لون التعبئة" : "Fill Color";
    case "link": return ar ? "رابط" : "Link";
    case "codeBlock": return ar ? "كتلة كود" : "Code Block";
    case "bullets": return ar ? "قائمة نقطية" : "Bullet List";
    case "numbered": return ar ? "قائمة مرقمة" : "Numbered List";
    case "alignLeft": return ar ? "محاذاة لليسار" : "Align Left";
    case "alignCenter": return ar ? "محاذاة للوسط" : "Align Center";
    case "alignRight": return ar ? "محاذاة لليمين" : "Align Right";
    case "dirRtl": return ar ? "اتجاه من اليمين لليسار" : "Right-to-left";
    case "dirLtr": return ar ? "اتجاه من اليسار لليمين" : "Left-to-right";
    case "indent": return ar ? "زيادة الإزاحة" : "Increase Indent";
    case "outdent": return ar ? "تقليل الإزاحة" : "Decrease Indent";
    case "clear": return ar ? "مسح التنسيق" : "Clear Formatting";
    case "horizontalRule": return ar ? "خط فاصل" : "Divider";
    case "table": return ar ? "جدول" : "Table";
    case "undo": return ar ? "تراجع" : "Undo";
    case "redo": return ar ? "إعادة" : "Redo";
    default: return toolId;
  }
}

function getFontSizeShortLabel(size: string): string {
  if (size === "Default") return "S";
  return size.replace("px", "");
}

function getHeadingShortLabel(type: string): string {
  if (type === "paragraph") return "P";
  if (type.startsWith("h")) return type.toUpperCase();
  return "P";
}

const CODE_BLOCK_BOX_COLORS = [
  "default",
  "light-gray",
  "light-blue",
  "light-green",
  "light-amber",
  "light-rose",
] as const;

type CodeBlockBoxColor = (typeof CODE_BLOCK_BOX_COLORS)[number];

function isCodeBlockBoxColor(value: string | null): value is CodeBlockBoxColor {
  return value !== null && CODE_BLOCK_BOX_COLORS.includes(value as CodeBlockBoxColor);
}

const CODE_BLOCK_DIRECTIONS = ["auto", "ltr", "rtl"] as const;

type CodeBlockDirection = (typeof CODE_BLOCK_DIRECTIONS)[number];

function isCodeBlockDirection(value: string | null): value is CodeBlockDirection {
  return value !== null && CODE_BLOCK_DIRECTIONS.includes(value as CodeBlockDirection);
}

const DIVIDER_VARIANTS = ["thin", "medium", "thick", "dashed", "dotted", "double"] as const;

type DividerVariant = (typeof DIVIDER_VARIANTS)[number];

function isDividerVariant(value: string | null): value is DividerVariant {
  return value !== null && DIVIDER_VARIANTS.includes(value as DividerVariant);
}

function getDividerVariantLabel(variant: DividerVariant, language: AppLanguage): string {
  if (language === "ar") {
    switch (variant) {
      case "thin": return "رفيع";
      case "medium": return "متوسط";
      case "thick": return "سميك";
      case "dashed": return "متقطع";
      case "dotted": return "منقط";
      case "double": return "مزدوج";
    }
  }

  switch (variant) {
    case "thin": return "Thin";
    case "medium": return "Medium";
    case "thick": return "Thick";
    case "dashed": return "Dashed";
    case "dotted": return "Dotted";
    case "double": return "Double";
  }
}

const CustomCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      boxColor: {
        default: "default",
        parseHTML: (element) => {
          const value = element.getAttribute("data-box-color");
          return isCodeBlockBoxColor(value) ? value : "default";
        },
        renderHTML: (attributes) => ({
          "data-box-color": isCodeBlockBoxColor(attributes.boxColor)
            ? attributes.boxColor
            : "default",
        }),
      },
      dir: {
        default: "auto",
        parseHTML: (element) => {
          const value = element.getAttribute("dir");
          return isCodeBlockDirection(value) ? value : "auto";
        },
        renderHTML: (attributes) => ({
          dir: isCodeBlockDirection(attributes.dir) ? attributes.dir : "auto",
        }),
      },
    };
  },
  addKeyboardShortcuts() {
    const selectCurrentCodeBlock = () => {
      const { state, view } = this.editor;
      const { $from } = state.selection;

      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === this.name) {
          const start = $from.start(depth);
          const end = $from.end(depth);
          view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)));
          return true;
        }
      }

      return false;
    };

    return {
      "Mod-a": selectCurrentCodeBlock,
    };
  },
});

const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dividerVariant: {
        default: "thin",
        parseHTML: (element) => {
          const value = element.getAttribute("data-divider-variant");
          return isDividerVariant(value) ? value : "thin";
        },
        renderHTML: (attributes) => {
          const variant = isDividerVariant(attributes.dividerVariant)
            ? attributes.dividerVariant
            : "thin";
          return { "data-divider-variant": variant };
        },
      },
    };
  },
});

// Table cells gain a backgroundColor attribute so the fill bucket can color
// selected cells via the built-in setCellAttribute command.
const cellBackgroundAttribute = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.style.backgroundColor || element.getAttribute("data-bg") || null,
    renderHTML: (attributes: Record<string, unknown>) => {
      const color = attributes.backgroundColor as string | null;
      if (!color) {
        return {};
      }
      return { style: `background-color: ${color}`, "data-bg": color };
    },
  },
};

const TableCellWithBg = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBackgroundAttribute };
  },
});

const TableHeaderWithBg = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBackgroundAttribute };
  },
});

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Custom Dropdown Component
function Dropdown<T extends string>({
  options,
  value,
  onChange,
  disabled,
  tooltip,
  label,
  className,
}: {
  readonly options: { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
  readonly tooltip?: string;
  readonly label: string;
  readonly className?: string;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`custom-dropdown-container ${className || ""}`} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="custom-dropdown-trigger"
        disabled={disabled}
        data-tooltip={tooltip}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="dropdown-label-text">{label}</span>
        <svg viewBox="0 0 24 24" className="dropdown-arrow-icon" aria-hidden="true">
          <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <ul className="custom-dropdown-menu" role="listbox">
          {options.map((option) => (
            <li
              key={option.value}
              className="custom-dropdown-item"
              data-selected={option.value === value ? "true" : "false"}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Custom Swatch Color Picker Component
function ColorPicker({
  value,
  onChange,
  disabled,
  tooltip,
  language,
  kind = "text",
}: {
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly disabled?: boolean;
  readonly tooltip?: string;
  readonly language: AppLanguage;
  readonly kind?: "text" | "fill";
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const swatches = [
    { name: "Reset", value: null, hex: "transparent" },
    { name: "White", value: "#f4f4f5", hex: "#f4f4f5" },
    { name: "Gray", value: "#71717a", hex: "#71717a" },
    { name: "Red", value: "#ef4444", hex: "#ef4444" },
    { name: "Orange", value: "#f97316", hex: "#f97316" },
    { name: "Amber", value: "#f59e0b", hex: "#f59e0b" },
    { name: "Lime", value: "#84cc16", hex: "#84cc16" },
    { name: "Green", value: "#10b981", hex: "#10b981" },
    { name: "Teal", value: "#14b8a6", hex: "#14b8a6" },
    { name: "Cyan", value: "#06b6d4", hex: "#06b6d4" },
    { name: "Blue", value: "#3b82f6", hex: "#3b82f6" },
    { name: "Indigo", value: "#6366f1", hex: "#6366f1" },
    { name: "Purple", value: "#8b5cf6", hex: "#8b5cf6" },
    { name: "Pink", value: "#ec4899", hex: "#ec4899" },
  ];

  return (
    <div className="custom-dropdown-container" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className="toolbar-icon-button color-picker-trigger"
        disabled={disabled}
        data-tooltip={tooltip}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {kind === "fill" ? (
          <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 11 9 1 7.5 2.5l2 2L3 11a2 2 0 0 0 0 2.8L8.2 19a2 2 0 0 0 2.8 0L19 11Z" />
            <path d="M5 13h12" />
            <path d="M21 16s2 2.5 2 4a2 2 0 1 1-4 0c0-1.5 2-4 2-4Z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35825 19.5 5.5 20 5.5 20.5C5.5 21.3284 6.17157 22 7 22H12Z" />
            <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
            <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
            <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
          </svg>
        )}
        <span
          className="color-preview-indicator"
          style={{
            backgroundColor: value || "transparent",
            border: value ? "1px solid var(--app-border-strong)" : "none",
          }}
        />
      </button>
      {isOpen && (
        <div className="color-picker-menu">
          <div className="color-picker-grid">
            {swatches.map((swatch) => {
              const getSwatchTooltip = (name: string) => {
                if (language === "ar") {
                  switch (name) {
                    case "Reset": return "إعادة تعيين";
                    case "White": return "أبيض";
                    case "Gray": return "رمادي";
                    case "Red": return "أحمر";
                    case "Orange": return "برتقالي";
                    case "Amber": return "كهرماني";
                    case "Lime": return "ليموني";
                    case "Green": return "أخضر";
                    case "Teal": return "أزرق مخضر";
                    case "Cyan": return "سماوي";
                    case "Blue": return "أزرق";
                    case "Indigo": return "نيلي";
                    case "Purple": return "أرجواني";
                    case "Pink": return "وردي";
                    default: return name;
                  }
                }
                return name;
              };
              return (
                <button
                  key={swatch.name}
                  className="color-swatch-button"
                  data-tooltip={getSwatchTooltip(swatch.name)}
                  onClick={() => {
                    onChange(swatch.value);
                    setIsOpen(false);
                  }}
                  style={{
                    backgroundColor: swatch.hex === "transparent" ? undefined : swatch.hex,
                  }}
                  type="button"
                >
                  {swatch.value === null && (
                    <span className="reset-color-cross" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlockColorPicker({
  value,
  onChange,
  disabled,
  tooltip,
  language,
}: {
  readonly value: CodeBlockBoxColor;
  readonly onChange: (value: CodeBlockBoxColor) => void;
  readonly disabled?: boolean;
  readonly tooltip?: string;
  readonly language: AppLanguage;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const swatches: {
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
  ];

  const getSwatchTooltip = (name: string) => {
    if (language !== "ar") return name;
    switch (name) {
      case "Default": return "افتراضي";
      case "Light gray": return "رمادي فاتح";
      case "Light blue": return "أزرق فاتح";
      case "Light green": return "أخضر فاتح";
      case "Light amber": return "كهرماني فاتح";
      case "Light rose": return "وردي فاتح";
      default: return name;
    }
  };

  return (
    <div className="custom-dropdown-container" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className="toolbar-icon-button color-picker-trigger code-block-color-trigger"
        disabled={disabled}
        data-tooltip={tooltip}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <ToolbarIconSvg icon="codeBlockColor" />
        <span
          className="color-preview-indicator"
          style={{
            backgroundColor: swatches.find((swatch) => swatch.value === value)?.hex,
            border: value === "default" ? "1px solid var(--app-border-strong)" : "1px solid rgba(0, 0, 0, 0.18)",
          }}
        />
      </button>
      {isOpen && (
        <div className="color-picker-menu code-block-color-menu">
          <div className="color-picker-grid code-block-color-grid">
            {swatches.map((swatch) => (
              <button
                key={swatch.value}
                aria-label={getSwatchTooltip(swatch.name)}
                className="color-swatch-button"
                data-active={swatch.value === value ? "true" : "false"}
                data-tooltip={getSwatchTooltip(swatch.name)}
                onClick={() => {
                  onChange(swatch.value);
                  setIsOpen(false);
                }}
                style={{ backgroundColor: swatch.hex }}
                type="button"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickCopyState {
  readonly text: string;
  readonly left: number;
  readonly top: number;
}

async function copyPlainText(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function SlidersIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="toolbar-button-icon" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function NoteEditorArea({
  activeCategoryName,
  draftContent,
  draftTitle,
  editorDensity,
  editorDirection,
  shortcuts,
  fontSize,
  isTrashView,
  saveStatus,
  selectedNote,
  showMetadata,
  theme,
  language,
  onContentChange,
  onDeletePermanent,
  onDeleteToTrash,
  onRestore,
  onSave,
  onThemeChange,
  onTitleChange,
  onExportNote,
}: NoteEditorAreaProps): JSX.Element {
  const hasSelectedNote = selectedNote !== null;
  const isSettingContentRef = useRef(false);
  const loadedNoteIdRef = useRef<number | null>(null);
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [quickCopy, setQuickCopy] = useState<QuickCopyState | null>(null);
  const [editorMenuPos, setEditorMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isTableCellSelected, setIsTableCellSelected] = useState(false);
  const [selectedDividerVariant, setSelectedDividerVariant] = useState<DividerVariant | null>(null);

  useEffect(() => {
    setEditorMenuPos(null);
  }, [selectedNote?.id]);

  const [isArrangeOpen, setIsArrangeOpen] = useState(false);
  const [visibleTools, setVisibleTools] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("nas-notesbook.editor.visibleTools");
    if (saved) {
      try {
        // Merge over defaults so tools added in later versions stay visible.
        return { ...DEFAULT_VISIBLE_TOOLS, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return { ...DEFAULT_VISIBLE_TOOLS };
  });
  const arrangePopoverRef = useRef<HTMLDivElement | null>(null);
  const arrangeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [arrangePos, setArrangePos] = useState<{ top: number; right: number } | null>(null);
  const [isDividerMenuOpen, setIsDividerMenuOpen] = useState(false);
  const dividerControlRef = useRef<HTMLDivElement | null>(null);

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themePopoverRef = useRef<HTMLDivElement | null>(null);
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [themePos, setThemePos] = useState<{ top: number; left: number } | null>(null);

  // Visibility changes apply immediately and persist (no "Done" step).
  const persistVisibleTools = (next: Record<string, boolean>) => {
    setVisibleTools(next);
    localStorage.setItem("nas-notesbook.editor.visibleTools", JSON.stringify(next));
  };

  const handleToggleTool = (toolId: string) => {
    persistVisibleTools({ ...visibleTools, [toolId]: !visibleTools[toolId] });
  };

  const handleResetTools = () => {
    persistVisibleTools({ ...DEFAULT_VISIBLE_TOOLS });
  };

  useEffect(() => {
    if (!isArrangeOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        arrangePopoverRef.current &&
        !arrangePopoverRef.current.contains(target) &&
        arrangeButtonRef.current &&
        !arrangeButtonRef.current.contains(target)
      ) {
        setIsArrangeOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsArrangeOpen(false);
      }
    };
    const close = () => setIsArrangeOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isArrangeOpen]);

  useEffect(() => {
    if (!isThemeMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        themePopoverRef.current &&
        !themePopoverRef.current.contains(target) &&
        themeButtonRef.current &&
        !themeButtonRef.current.contains(target)
      ) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsThemeMenuOpen(false);
    };
    const close = () => setIsThemeMenuOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isThemeMenuOpen]);

  useEffect(() => {
    if (!isDividerMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dividerControlRef.current &&
        !dividerControlRef.current.contains(event.target as Node)
      ) {
        setIsDividerMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDividerMenuOpen(false);
      }
    };
    const close = () => setIsDividerMenuOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isDividerMenuOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
      }),
      CustomHorizontalRule,
      CustomCodeBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      BackgroundColor,
      LineHeight,
      TextDirection,
      Indent,
      Table.configure({ resizable: true, cellMinWidth: 96 }),
      TableRow,
      TableHeaderWithBg,
      TableCellWithBg,
    ],
    content: draftContent,
    // TipTap installs the table-resize plugin only when the editor is editable
    // during construction; the effect below still enforces no-note/trash mode.
    editable: true,
    onUpdate: ({ editor }) => {
      if (isSettingContentRef.current) {
        return;
      }
      const html = editor.getHTML();
      const isMeaninglessHtml =
        !html ||
        html === "<p></p>" ||
        html === "<p><br></p>" ||
        html === "<p><br class=\"ProseMirror-trailingBreak\"></p>";
      const isEmpty = editor.getText().trim() === "" || isMeaninglessHtml;
      const content = isEmpty ? "" : html;
      onContentChange(content, editor.getText());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (!editor || isTrashView || !hasSelectedNote) {
          return false;
        }

        const match = (shortcutKey: string) => {
          const shortcut = shortcuts[shortcutKey];
          if (!shortcut) return false;
          const parts = shortcut.split("+");
          const hasCtrl = parts.includes("Ctrl");
          const hasAlt = parts.includes("Alt");
          const hasShift = parts.includes("Shift");
          const key = parts[parts.length - 1].toLowerCase();

          const eventCtrl = event.ctrlKey || event.metaKey;
          const eventAlt = event.altKey;
          const eventShift = event.shiftKey;
          const eventKey = event.key.toLowerCase();

          const isKeyMatch =
            eventKey === key ||
            event.code === "Key" + key.toUpperCase() ||
            event.code === "Digit" + key;

          return (
            hasCtrl === eventCtrl &&
            hasAlt === eventAlt &&
            hasShift === eventShift &&
            isKeyMatch
          );
        };

        if (match("toggleBold")) {
          event.preventDefault();
          editor.chain().focus().toggleBold().run();
          return true;
        }

        if (match("toggleItalic")) {
          event.preventDefault();
          editor.chain().focus().toggleItalic().run();
          return true;
        }

        if (match("toggleUnderline")) {
          event.preventDefault();
          editor.chain().focus().toggleUnderline().run();
          return true;
        }

        if (match("toggleStrike")) {
          event.preventDefault();
          editor.chain().focus().toggleStrike().run();
          return true;
        }

        if (match("toggleCode")) {
          event.preventDefault();
          editor.chain().focus().toggleCode().run();
          return true;
        }

        if (match("toggleCodeBlock")) {
          event.preventDefault();
          editor.chain().focus().toggleCodeBlock().run();
          return true;
        }

        if (match("toggleBulletList")) {
          event.preventDefault();
          editor.chain().focus().toggleBulletList().run();
          return true;
        }

        if (match("toggleNumberedList")) {
          event.preventDefault();
          editor.chain().focus().toggleOrderedList().run();
          return true;
        }

        if (match("toggleBlockquote")) {
          event.preventDefault();
          editor.chain().focus().toggleBlockquote().run();
          return true;
        }

        if (match("clearFormatting")) {
          event.preventDefault();
          editor
            .chain()
            .focus()
            .clearNodes()
            .unsetAllMarks()
            .unsetColor()
            .unsetFontFamily()
            .unsetFontSize()
            .unsetLink()
            .run();
          return true;
        }

        return false;
      },
    },
  });

  // Keep editor read-only status in sync
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isTrashView && hasSelectedNote);
    }
  }, [editor, isTrashView, hasSelectedNote]);

  useEffect(() => {
    if (!editor) {
      setIsTableCellSelected(false);
      return;
    }

    const updateTableCellSelection = () => {
      setIsTableCellSelected(
        editor.isActive("tableCell") || editor.isActive("tableHeader")
      );
    };

    updateTableCellSelection();
    editor.on("selectionUpdate", updateTableCellSelection);
    editor.on("transaction", updateTableCellSelection);
    editor.on("blur", updateTableCellSelection);
    return () => {
      editor.off("selectionUpdate", updateTableCellSelection);
      editor.off("transaction", updateTableCellSelection);
      editor.off("blur", updateTableCellSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      setSelectedDividerVariant(null);
      return;
    }

    const updateDividerSelection = () => {
      const { selection } = editor.state;
      const isDividerSelected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "horizontalRule";

      if (!isDividerSelected) {
        setSelectedDividerVariant(null);
        return;
      }

      const variant = selection.node.attrs.dividerVariant as string | null;
      setSelectedDividerVariant(isDividerVariant(variant) ? variant : "thin");
    };

    updateDividerSelection();
    editor.on("selectionUpdate", updateDividerSelection);
    editor.on("transaction", updateDividerSelection);
    editor.on("blur", updateDividerSelection);
    return () => {
      editor.off("selectionUpdate", updateDividerSelection);
      editor.off("transaction", updateDividerSelection);
      editor.off("blur", updateDividerSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const updateQuickCopy = () => {
      const { state, view } = editor;
      const { from, to, empty } = state.selection;
      if (empty || from === to) {
        setQuickCopy(null);
        return;
      }

      const text = state.doc.textBetween(from, to, "\n");
      if (text.trim().length === 0) {
        setQuickCopy(null);
        return;
      }

      const coords = view.coordsAtPos(to);
      const left = Math.min(Math.max(coords.left, 8), window.innerWidth - 72);
      const top = Math.min(Math.max(coords.bottom + 8, 8), window.innerHeight - 42);
      setQuickCopy({ text, left, top });
    };

    editor.on("selectionUpdate", updateQuickCopy);
    editor.on("transaction", updateQuickCopy);
    editor.on("blur", updateQuickCopy);
    return () => {
      editor.off("selectionUpdate", updateQuickCopy);
      editor.off("transaction", updateQuickCopy);
      editor.off("blur", updateQuickCopy);
    };
  }, [editor]);

  // Synchronize editor content when selectedNote changes
  useEffect(() => {
    if (editor) {
      if (selectedNote) {
        if (loadedNoteIdRef.current !== selectedNote.id) {
          const targetContent =
            selectedNote.contentHtml && selectedNote.contentHtml.trim() !== ""
              ? selectedNote.contentHtml
              : selectedNote.contentMarkdown || "";
          
          isSettingContentRef.current = true;
          editor.commands.setContent(targetContent);
          loadedNoteIdRef.current = selectedNote.id;
          isSettingContentRef.current = false;
        }
      } else {
        isSettingContentRef.current = true;
        editor.commands.setContent("");
        loadedNoteIdRef.current = null;
        isSettingContentRef.current = false;
      }
    }
  }, [selectedNote?.id, editor]);

  const isEditorEmpty = editor
    ? editor.getText().trim() === "" ||
      editor.getHTML() === "<p></p>" ||
      editor.getHTML() === "<p><br></p>" ||
      editor.getHTML() === "<p><br class=\"ProseMirror-trailingBreak\"></p>"
    : true;
  const activeThemeLabel = (() => {
    const found = EDITOR_THEMES.find((th) => th.value === theme);
    if (!found) return language === "ar" ? "السمة" : "Theme";
    return language === "ar" ? found.labelAr : found.labelEn;
  })();

  // Dropdown option maps
  const fontFamilies = [
    { value: "System", label: language === "ar" ? "نظام" : "System" },
    { value: "Segoe UI", label: "Segoe UI" },
    { value: "Arial", label: "Arial" },
    { value: "IBM Plex Sans Arabic Local", label: "IBM Plex Sans Arabic" },
    { value: "Georgia", label: "Georgia" },
    { value: "Consolas", label: "Consolas" },
  ];

  const fontSizes = [
    { value: "Default", label: language === "ar" ? "الافتراضي" : "Default" },
    { value: "13px", label: "13px" },
    { value: "15px", label: "15px" },
    { value: "17px", label: "17px" },
    { value: "20px", label: "20px" },
    { value: "24px", label: "24px" },
    { value: "32px", label: "32px" },
  ];

  const headingTypes = [
    { value: "paragraph", label: language === "ar" ? "فقرة" : "Paragraph" },
    { value: "h1", label: language === "ar" ? "عنوان 1" : "Heading 1" },
    { value: "h2", label: language === "ar" ? "عنوان 2" : "Heading 2" },
    { value: "h3", label: language === "ar" ? "عنوان 3" : "Heading 3" },
    { value: "h4", label: language === "ar" ? "عنوان 4" : "Heading 4" },
    { value: "h5", label: language === "ar" ? "عنوان 5" : "Heading 5" },
    { value: "h6", label: language === "ar" ? "عنوان 6" : "Heading 6" },
  ];

  const lineHeights = [
    { value: "1.0", label: "1.0" },
    { value: "1.25", label: "1.25" },
    { value: "1.5", label: "1.5" },
    { value: "1.75", label: "1.75" },
    { value: "2.0", label: "2.0" },
  ];

  const activeFontFamily = editor
    ? editor.getAttributes("textStyle").fontFamily || "System"
    : "System";

  const activeFontFamilyLabel =
    fontFamilies.find((font) => font.value === activeFontFamily)?.label || activeFontFamily;

  const activeFontSize = editor
    ? editor.getAttributes("textStyle").fontSize || "Default"
    : "Default";

  const activeHeadingType = editor
    ? editor.isActive("heading", { level: 1 })
      ? "h1"
      : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
      ? "h4"
      : editor.isActive("heading", { level: 5 })
      ? "h5"
      : editor.isActive("heading", { level: 6 })
      ? "h6"
      : "paragraph"
    : "paragraph";

  const activeHeadingLabel = headingTypes.find((t) => t.value === activeHeadingType)?.label || (language === "ar" ? "فقرة" : "Paragraph");

  const activeLineHeight = editor
    ? editor.getAttributes("paragraph")["data-line-height"] ||
      editor.getAttributes("heading")["data-line-height"] ||
      "1.5"
    : "1.5";

  const activeTextColor = editor
    ? editor.getAttributes("textStyle").color || null
    : null;

  const isCellSelected = isTableCellSelected;

  const activeFillColor = editor
    ? (isCellSelected
        ? editor.getAttributes("tableCell").backgroundColor ||
          editor.getAttributes("tableHeader").backgroundColor
        : editor.getAttributes("textStyle").backgroundColor) || null
    : null;

  const activeBlockDir: string | null = editor
    ? editor.getAttributes("paragraph").dir ||
      editor.getAttributes("heading").dir ||
      (editor.isActive("codeBlock") ? editor.getAttributes("codeBlock").dir : null) ||
      null
    : null;

  const activeCodeBlockBoxColor = editor && editor.isActive("codeBlock")
    ? editor.getAttributes("codeBlock").boxColor
    : "default";
  const activeCodeBlockColor = isCodeBlockBoxColor(activeCodeBlockBoxColor)
    ? activeCodeBlockBoxColor
    : "default";

  const activeCodeBlockDirValue = editor && editor.isActive("codeBlock")
    ? editor.getAttributes("codeBlock").dir
    : "auto";
  const activeCodeBlockDir = isCodeBlockDirection(activeCodeBlockDirValue)
    ? activeCodeBlockDirValue
    : "auto";

  const insertDivider = (variant: DividerVariant = "thin") => {
    if (!editor || isTrashView || !selectedNote) return;

    editor
      .chain()
      .focus()
      .insertContent({ type: "horizontalRule", attrs: { dividerVariant: variant } })
      .run();
  };

  const applyDividerVariant = (variant: DividerVariant) => {
    if (!editor || isTrashView || !selectedNote) return;

    const { selection } = editor.state;
    const isDividerSelected =
      selection instanceof NodeSelection &&
      selection.node.type.name === "horizontalRule";

    if (isDividerSelected) {
      editor.chain().focus().updateAttributes("horizontalRule", { dividerVariant: variant }).run();
    } else {
      insertDivider(variant);
    }

    setIsDividerMenuOpen(false);
  };

  const codeBlockDirectionOptions: {
    readonly value: CodeBlockDirection;
    readonly label: string;
  }[] = [
    { value: "auto", label: language === "ar" ? "تلقائي" : "Auto" },
    { value: "ltr", label: "LTR" },
    { value: "rtl", label: "RTL" },
  ];

  const convertSelectionToSingleCodeBlock = () => {
    if (!editor || isTrashView || !selectedNote) return;

    const { state } = editor;
    const { from, to, empty } = state.selection;

    if (editor.isActive("codeBlock")) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    if (empty) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const selectedText = state.doc.textBetween(from, to, "\n", "\n");

    if (!selectedText.trim()) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    editor
      .chain()
      .focus()
      .deleteSelection()
      .insertContent({
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: selectedText,
          },
        ],
      })
      .run();
  };

  const handleEditorContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!editor || isTrashView || !hasSelectedNote) {
      return;
    }

    setEditorMenuPos({ x: event.clientX, y: event.clientY });
  };

  const getContextMenuNodes = (): readonly MenuNode[] => {
    if (!editor) return [];

    const isAr = language === "ar";
    const selection = editor.state.selection;
    const isSelectionEmpty = selection.empty;
    const hasLink = editor.isActive("link");

    const getSelectionText = () => {
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to, "\n");
    };

    const handleCopy = () => {
      const txt = getSelectionText();
      if (txt) {
        navigator.clipboard.writeText(txt);
      }
    };

    const handleCut = () => {
      const txt = getSelectionText();
      if (txt) {
        navigator.clipboard.writeText(txt);
        editor.chain().focus().deleteSelection().run();
      }
    };

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        editor.chain().focus().insertContent(text).run();
      } catch {
        document.execCommand("paste");
      }
    };

    const handlePastePlain = async () => {
      try {
        const text = await navigator.clipboard.readText();
        editor.chain().focus().insertContent(text).run();
      } catch {
        document.execCommand("paste");
      }
    };

    const handleCopySelectionAsMarkdown = () => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      let html = "";
      try {
        const fragment = editor.state.doc.slice(from, to).content;
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const div = document.createElement("div");
        div.appendChild(serializer.serializeFragment(fragment));
        html = div.innerHTML;
      } catch {
        html = getSelectionText();
      }
      
      const md = htmlToMarkdown(html);
      navigator.clipboard.writeText(md);
    };

    const handleCopyNoteAsMarkdown = () => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      navigator.clipboard.writeText(md);
    };

    const editingNodes: MenuNode[] = [
      {
        kind: "item",
        id: "cut",
        label: isAr ? "قص" : "Cut",
        shortcut: "Ctrl+X",
        disabled: isSelectionEmpty,
        onSelect: handleCut,
      },
      {
        kind: "item",
        id: "copy",
        label: isAr ? "نسخ" : "Copy",
        shortcut: "Ctrl+C",
        disabled: isSelectionEmpty,
        onSelect: handleCopy,
      },
      {
        kind: "item",
        id: "paste",
        label: isAr ? "لصق" : "Paste",
        shortcut: "Ctrl+V",
        onSelect: handlePaste,
      },
      {
        kind: "item",
        id: "pastePlain",
        label: isAr ? "لصق كنص عادي" : "Paste as plain text",
        shortcut: "Ctrl+Shift+V",
        onSelect: handlePastePlain,
      },
      {
        kind: "item",
        id: "selectAll",
        label: isAr ? "تحديد الكل" : "Select All",
        shortcut: "Ctrl+A",
        onSelect: () => editor.chain().focus().selectAll().run(),
      },
    ];

    const formatNodes: MenuNode[] = [
      {
        kind: "item",
        id: "paragraph",
        label: isAr ? "فقرة" : "Paragraph",
        checked: editor.isActive("paragraph"),
        onSelect: () => editor.chain().focus().setParagraph().run(),
      },
      {
        kind: "item",
        id: "h1",
        label: isAr ? "عنوان 1" : "Heading 1",
        checked: editor.isActive("heading", { level: 1 }),
        onSelect: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        kind: "item",
        id: "h2",
        label: isAr ? "عنوان 2" : "Heading 2",
        checked: editor.isActive("heading", { level: 2 }),
        onSelect: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        kind: "item",
        id: "h3",
        label: isAr ? "عنوان 3" : "Heading 3",
        checked: editor.isActive("heading", { level: 3 }),
        onSelect: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      { kind: "separator", id: "fmt-sep-1" },
      {
        kind: "item",
        id: "bold",
        label: isAr ? "عريض" : "Bold",
        shortcut: "Ctrl+B",
        checked: editor.isActive("bold"),
        onSelect: () => editor.chain().focus().toggleBold().run(),
      },
      {
        kind: "item",
        id: "italic",
        label: isAr ? "مائل" : "Italic",
        shortcut: "Ctrl+I",
        checked: editor.isActive("italic"),
        onSelect: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        kind: "item",
        id: "underline",
        label: isAr ? "مسطر" : "Underline",
        shortcut: "Ctrl+U",
        checked: editor.isActive("underline"),
        onSelect: () => editor.chain().focus().toggleUnderline().run(),
      },
      {
        kind: "item",
        id: "strike",
        label: isAr ? "يتوسطه خط" : "Strike",
        checked: editor.isActive("strike"),
        onSelect: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        kind: "item",
        id: "code",
        label: isAr ? "كود برمجى" : "Inline Code",
        checked: editor.isActive("code"),
        onSelect: () => editor.chain().focus().toggleCode().run(),
      },
      { kind: "separator", id: "fmt-sep-2" },
      {
        kind: "item",
        id: "clearFormatting",
        label: isAr ? "مسح التنسيق" : "Clear formatting",
        onSelect: () => editor.chain().focus().clearNodes().unsetAllMarks().unsetColor().unsetFontFamily().unsetFontSize().unsetLink().run(),
      },
    ];

    const blocksNodes: MenuNode[] = [
      {
        kind: "item",
        id: "quote",
        label: isAr ? "اقتباس" : "Quote",
        checked: editor.isActive("blockquote"),
        onSelect: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        kind: "item",
        id: "codeBlock",
        label: isAr ? "كتلة كود" : "Code Block",
        checked: editor.isActive("codeBlock"),
        onSelect: () => convertSelectionToSingleCodeBlock(),
      },
      {
        kind: "item",
        id: "bulletList",
        label: isAr ? "قائمة نقطية" : "Bullet List",
        checked: editor.isActive("bulletList"),
        onSelect: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        kind: "item",
        id: "numberList",
        label: isAr ? "قائمة رقمية" : "Number List",
        checked: editor.isActive("orderedList"),
        onSelect: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        kind: "item",
        id: "checklist",
        label: isAr ? "قائمة مهام (قريباً)" : "Checklist (Coming soon)",
        disabled: true,
      },
    ];

    const alignmentNodes: MenuNode[] = [
      {
        kind: "item",
        id: "alignLeft",
        label: isAr ? "محاذاة لليسار" : "Align left",
        checked: editor.isActive({ textAlign: "left" }),
        onSelect: () => editor.chain().focus().setTextAlign("left").run(),
      },
      {
        kind: "item",
        id: "alignCenter",
        label: isAr ? "محاذاة للوسط" : "Align center",
        checked: editor.isActive({ textAlign: "center" }),
        onSelect: () => editor.chain().focus().setTextAlign("center").run(),
      },
      {
        kind: "item",
        id: "alignRight",
        label: isAr ? "محاذاة لليمين" : "Align right",
        checked: editor.isActive({ textAlign: "right" }),
        onSelect: () => editor.chain().focus().setTextAlign("right").run(),
      },
    ];

    const linkNodes: MenuNode[] = [
      {
        kind: "item",
        id: "addLink",
        label: hasLink ? (isAr ? "تعديل الرابط" : "Edit Link") : (isAr ? "إضافة رابط" : "Add Link"),
        onSelect: () => setIsLinkDialogOpen(true),
      },
      {
        kind: "item",
        id: "removeLink",
        label: isAr ? "إزالة الرابط" : "Remove Link",
        disabled: !hasLink,
        onSelect: handleLinkRemove,
      },
    ];

    const markdownNodes: MenuNode[] = [
      {
        kind: "item",
        id: "copySelectionMarkdown",
        label: isAr ? "نسخ التحديد كـ Markdown" : "Copy selection as Markdown",
        disabled: isSelectionEmpty,
        onSelect: handleCopySelectionAsMarkdown,
      },
      {
        kind: "item",
        id: "copyNoteMarkdown",
        label: isAr ? "نسخ الملاحظة كـ Markdown" : "Copy note as Markdown",
        onSelect: handleCopyNoteAsMarkdown,
      },
      {
        kind: "item",
        id: "exportNoteMarkdown",
        label: isAr ? "تصدير الملاحظة" : "Export current note",
        disabled: !onExportNote,
        onSelect: () => onExportNote?.(),
      },
    ];

    const noteNodes: MenuNode[] = [
      {
        kind: "item",
        id: "renameNote",
        label: isAr ? "إعادة تسمية" : "Rename",
        onSelect: () => {
          const titleInput = document.querySelector(".note-title-input") as HTMLInputElement | null;
          if (titleInput) {
            titleInput.focus();
            titleInput.select();
          }
        },
      },
      {
        kind: "item",
        id: "moveNote",
        label: isAr ? "نقل إلى مجلد (استخدم قائمة الملاحظات)" : "Move to folder (Use note list)",
        disabled: true,
      },
      {
        kind: "item",
        id: "deleteNote",
        label: isAr ? "حذف إلى سلة المهملات" : "Delete to Trash",
        danger: true,
        onSelect: onDeleteToTrash,
      },
    ];

    return [
      { kind: "header", id: "h-editing", label: isAr ? "تعديل" : "Editing" },
      ...editingNodes,
      { kind: "separator", id: "sep-1" },
      {
        kind: "item",
        id: "fmt-submenu",
        label: isAr ? "تنسيق" : "Format",
        submenu: formatNodes,
      },
      {
        kind: "item",
        id: "blocks-submenu",
        label: isAr ? "كتل" : "Blocks",
        submenu: blocksNodes,
      },
      {
        kind: "item",
        id: "align-submenu",
        label: isAr ? "محاذاة" : "Alignment",
        submenu: alignmentNodes,
      },
      { kind: "separator", id: "sep-2" },
      {
        kind: "item",
        id: "link-submenu",
        label: isAr ? "رابط" : "Link",
        submenu: linkNodes,
      },
      { kind: "separator", id: "sep-3" },
      {
        kind: "item",
        id: "md-submenu",
        label: isAr ? "Markdown تصدير" : "Markdown / Export",
        submenu: markdownNodes,
      },
      { kind: "separator", id: "sep-4" },
      {
        kind: "item",
        id: "note-submenu",
        label: isAr ? "ملاحظة" : "Note",
        submenu: noteNodes,
      },
    ];
  };

  const handleLinkConfirm = (url: string) => {
    if (editor) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setIsLinkDialogOpen(false);
  };

  const handleLinkRemove = () => {
    if (editor) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setIsLinkDialogOpen(false);
  };

  return (
    <section
      className="editor-area"
      aria-label="Editor placeholder"
      data-editor-density={editorDensity}
      data-editor-font-size={fontSize}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* Physical top-left slot — intentionally uses left (not inset-inline). */}
      <div className="editor-theme-slot">
        <div className="editor-theme-control">
          <button
            ref={themeButtonRef}
            aria-label={language === "ar" ? "السمات" : "Themes"}
            className="editor-theme-trigger"
            data-active={isThemeMenuOpen ? "true" : "false"}
            data-tooltip={t("tooltipTheme", language)}
            type="button"
            onClick={() => {
              if (!isThemeMenuOpen && themeButtonRef.current) {
                const r = themeButtonRef.current.getBoundingClientRect();
                setThemePos({ top: r.bottom + 6, left: r.left });
              }
              setIsThemeMenuOpen(!isThemeMenuOpen);
            }}
          >
            <span className="editor-theme-name">{activeThemeLabel}</span>
            <span className="editor-theme-caret" aria-hidden="true">▾</span>
          </button>
          {isThemeMenuOpen && themePos && createPortal(
            <div
              ref={themePopoverRef}
              className="editor-theme-popover"
              dir={language === "ar" ? "rtl" : "ltr"}
              style={{ position: "fixed", top: themePos.top, left: themePos.left }}
            >
              {EDITOR_THEMES.map((th) => (
                <button
                  key={th.value}
                  type="button"
                  className="editor-theme-item"
                  data-selected={th.value === theme ? "true" : "false"}
                  onClick={() => {
                    onThemeChange(th.value);
                    setIsThemeMenuOpen(false);
                  }}
                >
                  <span className="editor-theme-swatches" aria-hidden="true">
                    {th.colors.map((c, i) => (
                      <span key={i} className="editor-theme-swatch" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="editor-theme-item-name">
                    {language === "ar" ? th.labelAr : th.labelEn}
                  </span>
                  {th.value === theme && <span className="editor-theme-check">✓</span>}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>
      <header className="editor-header">
        <div style={{ flex: 1 }}>
          <span className="editor-eyebrow">{activeCategoryName}</span>
          <input
            className="note-title-input"
            disabled={!hasSelectedNote || isTrashView}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t("noteTitlePlaceholder", language)}
            type="text"
            value={draftTitle}
            dir={editorDirection}
          />
          {hasSelectedNote && showMetadata && (
            <div className="note-metadata-row">
              {selectedNote.createdAt && (
                <span className="metadata-item">
                  {t("createdAt", language)} {formatDateTime(selectedNote.createdAt)}
                </span>
              )}
              {selectedNote.updatedAt && (
                <span className="metadata-item">
                  {t("updatedAt", language)} {formatDateTime(selectedNote.updatedAt)}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {isTrashView && hasSelectedNote && (
        <div className="editor-trash-banner">
          <span>{t("trashBanner", language)}</span>
        </div>
      )}

      <div className="editor-toolbar" aria-label="Editor toolbar">
        {/* Group 1: Save + status */}
        <div className="toolbar-group note-actions">
          {!isTrashView ? (
            <>
              <div className="note-save-group">
                <button
                  aria-label={t("tooltipSave", language)}
                  className="toolbar-action-button"
                  disabled={!hasSelectedNote}
                  data-tooltip={t("tooltipSave", language)}
                  onClick={onSave}
                  type="button"
                >
                  <ToolbarIconSvg icon="save" />
                </button>
                <span
                  className="save-status-pill"
                  data-status={saveStatus.toLowerCase()}
                  data-tooltip={
                    saveStatus === "Idle" || saveStatus === "Saved"
                      ? t("saved", language)
                      : saveStatus === "Unsaved"
                      ? t("unsavedChanges", language)
                      : saveStatus === "Saving"
                      ? t("saving", language)
                      : saveStatus === "Error"
                      ? t("saveError", language)
                      : saveStatus
                  }
                  aria-label={saveStatus}
                >
                  {(() => {
                    const status = saveStatus.toLowerCase();
                    if (status === "saving") {
                      return (
                        <svg
                          viewBox="0 0 24 24"
                          className="status-spinner"
                          style={{ color: "#60a5fa", width: "16px", height: "16px" }}
                          fill="none"
                        >
                          <path
                            d="M21 12a9 9 0 1 1-6.219-8.56"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      );
                    }
                    if (status === "unsaved") {
                      return (
                        <svg
                          viewBox="0 0 24 24"
                          className="status-pulse"
                          style={{ color: "#fbbf24", width: "12px", height: "12px" }}
                        >
                          <circle cx="12" cy="12" r="8" fill="currentColor" />
                        </svg>
                      );
                    }
                    if (status === "error") {
                      return (
                        <svg
                          viewBox="0 0 24 24"
                          style={{ color: "#f87171", width: "16px", height: "16px" }}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12" y2="16.01" strokeWidth="3" />
                        </svg>
                      );
                    }
                    // Default / Idle / Saved
                    return (
                      <svg
                        viewBox="0 0 24 24"
                        style={{ color: "#4ade80", width: "16px", height: "16px" }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    );
                  })()}
                </span>
              </div>
              
              <div className="toolbar-divider" />
              
              {/* Group 2: Delete to Trash */}
              <button
                aria-label={t("tooltipDeleteToTrash", language)}
                className="toolbar-action-button toolbar-danger-action"
                disabled={!hasSelectedNote}
                data-tooltip={t("tooltipDeleteToTrash", language)}
                onClick={onDeleteToTrash}
                type="button"
              >
                <ToolbarIconSvg icon="trash" />
              </button>
            </>
          ) : (
            <>
              <button
                aria-label={t("tooltipRestore", language)}
                className="toolbar-action-button"
                disabled={!hasSelectedNote}
                data-tooltip={t("tooltipRestore", language)}
                onClick={onRestore}
                type="button"
              >
                <ToolbarIconSvg icon="restore" />
              </button>
              <button
                aria-label={t("tooltipDeletePermanent", language)}
                className="toolbar-action-button danger-button"
                disabled={!hasSelectedNote}
                data-tooltip={t("tooltipDeletePermanent", language)}
                onClick={onDeletePermanent}
                type="button"
              >
                <ToolbarIconSvg icon="deletePermanent" />
              </button>
              <div className="toolbar-divider" />
              <span
                className="save-status-pill"
                data-status="saved"
                data-tooltip={t("saved", language)}
                aria-label="Saved"
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ color: "#4ade80", width: "16px", height: "16px" }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </>
          )}
        </div>
 
        {editor && (
          <>
            {(visibleTools.undo !== false || visibleTools.redo !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group history-actions">
                  {visibleTools.undo !== false && (
                    <button
                      aria-label="Undo"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView || !editor.can().undo()}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().undo().run();
                      }}
                      data-tooltip={language === "ar" ? "تراجع" : "Undo"}
                    >
                      <ToolbarIconSvg icon="undo" />
                    </button>
                  )}
                  {visibleTools.redo !== false && (
                    <button
                      aria-label="Redo"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView || !editor.can().redo()}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().redo().run();
                      }}
                      data-tooltip={language === "ar" ? "إعادة" : "Redo"}
                    >
                      <ToolbarIconSvg icon="redo" />
                    </button>
                  )}
                </div>
              </>
            )}
            {(visibleTools.fontFamily !== false || visibleTools.fontSize !== false || visibleTools.heading !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group font-and-type-actions">
                  {visibleTools.fontFamily !== false && (
                    <Dropdown
                      label={activeFontFamilyLabel}
                      value={activeFontFamily}
                      options={fontFamilies}
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={`${t("tooltipFontFamily", language)}: ${language === "ar" && activeFontFamily === "System" ? "نظام" : activeFontFamily}`}
                      className="font-family-dropdown"
                      onChange={(val) => {
                        if (val === "System") {
                          editor.chain().focus().unsetFontFamily().run();
                        } else {
                          editor.chain().focus().setFontFamily(val).run();
                        }
                      }}
                    />
                  )}
                  {visibleTools.fontSize !== false && (
                    <Dropdown
                      label={getFontSizeShortLabel(activeFontSize)}
                      value={activeFontSize}
                      options={fontSizes}
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={`${t("tooltipFontSize", language)}: ${language === "ar" && activeFontSize === "Default" ? "الافتراضي" : activeFontSize}`}
                      className="font-size-dropdown"
                      onChange={(val) => {
                        if (val === "Default") {
                          editor.chain().focus().unsetFontSize().run();
                        } else {
                          editor.chain().focus().setFontSize(val).run();
                        }
                      }}
                    />
                  )}
                  {visibleTools.heading !== false && (
                    <Dropdown
                      label={getHeadingShortLabel(activeHeadingType)}
                      value={activeHeadingType}
                      options={headingTypes}
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={`${t("tooltipTextType", language)}: ${activeHeadingLabel}`}
                      className="text-type-dropdown"
                      onChange={(val) => {
                        if (val === "paragraph") {
                          editor.chain().focus().setParagraph().run();
                        } else if (val.startsWith("h")) {
                          const level = parseInt(val.replace("h", ""), 10) as 1 | 2 | 3 | 4 | 5 | 6;
                          editor.chain().focus().toggleHeading({ level }).run();
                        }
                      }}
                    />
                  )}
                  {visibleTools.lineHeight !== false && (
                    <Dropdown
                      label={activeLineHeight}
                      value={activeLineHeight}
                      options={lineHeights}
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={`${language === "ar" ? "تباعد الأسطر" : "Line height"}: ${activeLineHeight}`}
                      className="line-height-dropdown"
                      onChange={(val) => {
                        if (val === "1.5") {
                          editor.chain().focus().unsetLineHeight().run();
                        } else {
                          editor.chain().focus().setLineHeight(val).run();
                        }
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {(visibleTools.bold !== false || visibleTools.italic !== false || visibleTools.underline !== false || visibleTools.textColor !== false || visibleTools.link !== false || visibleTools.codeBlock !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group formatting-actions">
                  {visibleTools.bold !== false && (
                    <button
                      aria-label="Bold"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().toggleBold().run();
                      }}
                      data-active={editor.isActive("bold") ? "true" : "false"}
                      data-tooltip={t("tooltipBold", language)}
                    >
                      <ToolbarIconSvg icon="bold" />
                    </button>
                  )}
                  {visibleTools.italic !== false && (
                    <button
                      aria-label="Italic"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().toggleItalic().run();
                      }}
                      data-active={editor.isActive("italic") ? "true" : "false"}
                      data-tooltip={t("tooltipItalic", language)}
                    >
                      <ToolbarIconSvg icon="italic" />
                    </button>
                  )}
                  {visibleTools.underline !== false && (
                    <button
                      aria-label="Underline"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().toggleUnderline().run();
                      }}
                      data-active={editor.isActive("underline") ? "true" : "false"}
                      data-tooltip={t("tooltipUnderline", language)}
                    >
                      <ToolbarIconSvg icon="underline" />
                    </button>
                  )}
                  {visibleTools.textColor !== false && (
                    <ColorPicker
                      value={activeTextColor}
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={t("tooltipTextColor", language)}
                      language={language}
                      onChange={(val) => {
                        if (val === null) {
                          editor.chain().focus().unsetColor().run();
                        } else {
                          editor.chain().focus().setColor(val).run();
                        }
                      }}
                    />
                  )}
                  {visibleTools.fillColor !== false && (
                    <ColorPicker
                      value={activeFillColor}
                      kind="fill"
                      disabled={!hasSelectedNote || isTrashView}
                      tooltip={language === "ar" ? "لون التعبئة" : "Fill color"}
                      language={language}
                      onChange={(val) => {
                        const chain = editor.chain().focus();
                        if (isCellSelected) {
                          chain.setCellAttribute("backgroundColor", val).run();
                        } else if (val === null) {
                          chain.unsetBackgroundColor().run();
                        } else {
                          chain.setBackgroundColor(val).run();
                        }
                      }}
                    />
                  )}
                  {visibleTools.link !== false && (
                    <button
                      aria-label="Link"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onClick={() => setIsLinkDialogOpen(true)}
                      data-active={editor.isActive("link") ? "true" : "false"}
                      data-tooltip={t("tooltipLink", language)}
                    >
                      <ToolbarIconSvg icon="link" />
                    </button>
                  )}
                  {visibleTools.codeBlock !== false && (
                    <>
                      <button
                        aria-label={language === "ar" ? "كتلة كود" : "Code block"}
                        className="toolbar-icon-button"
                        type="button"
                        disabled={!hasSelectedNote || isTrashView}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          convertSelectionToSingleCodeBlock();
                        }}
                        data-active={editor.isActive("codeBlock") ? "true" : "false"}
                        data-tooltip={language === "ar" ? "كتلة كود" : "Code block"}
                      >
                        <ToolbarIconSvg icon="codeBlock" />
                      </button>
                      <CodeBlockColorPicker
                        value={activeCodeBlockColor}
                        disabled={!hasSelectedNote || isTrashView}
                        tooltip={language === "ar" ? "لون صندوق الكود" : "Code block color"}
                        language={language}
                        onChange={(val) => {
                          const chain = editor.chain().focus();
                          if (!editor.isActive("codeBlock")) {
                            chain.setCodeBlock();
                          }
                          chain.updateAttributes("codeBlock", { boxColor: val }).run();
                        }}
                      />
                      <Dropdown
                        label={activeCodeBlockDir.toUpperCase()}
                        value={activeCodeBlockDir}
                        options={codeBlockDirectionOptions}
                        disabled={!hasSelectedNote || isTrashView}
                        tooltip={language === "ar" ? "اتجاه كتلة الكود" : "Code block direction"}
                        className="code-direction-dropdown"
                        onChange={(val) => {
                          const chain = editor.chain().focus();
                          if (!editor.isActive("codeBlock")) {
                            chain.setCodeBlock();
                          }
                          chain.updateAttributes("codeBlock", { dir: val }).run();
                        }}
                      />
                    </>
                  )}
                </div>
              </>
            )}

            {(visibleTools.bullets !== false || visibleTools.numbered !== false || visibleTools.alignLeft !== false || visibleTools.alignCenter !== false || visibleTools.alignRight !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group layout-actions">
                  {visibleTools.bullets !== false && (
                    <button
                      aria-label="Bullets"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().toggleBulletList().run();
                      }}
                      data-active={editor.isActive("bulletList") ? "true" : "false"}
                      data-tooltip={t("tooltipBullets", language)}
                    >
                      <ToolbarIconSvg icon="bullets" />
                    </button>
                  )}
                  {visibleTools.numbered !== false && (
                    <button
                      aria-label="Numbered"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().toggleOrderedList().run();
                      }}
                      data-active={editor.isActive("orderedList") ? "true" : "false"}
                      data-tooltip={t("tooltipNumbered", language)}
                    >
                      <ToolbarIconSvg icon="numbered" />
                    </button>
                  )}
                  {visibleTools.alignLeft !== false && (
                    <button
                      aria-label="Align Left"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().setTextAlign("left").run();
                      }}
                      data-active={editor.isActive({ textAlign: "left" }) ? "true" : "false"}
                      data-tooltip={t("tooltipAlignLeft", language)}
                    >
                      <ToolbarIconSvg icon="alignLeft" />
                    </button>
                  )}
                  {visibleTools.alignCenter !== false && (
                    <button
                      aria-label="Align Center"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().setTextAlign("center").run();
                      }}
                      data-active={editor.isActive({ textAlign: "center" }) ? "true" : "false"}
                      data-tooltip={t("tooltipAlignCenter", language)}
                    >
                      <ToolbarIconSvg icon="alignCenter" />
                    </button>
                  )}
                  {visibleTools.alignRight !== false && (
                    <button
                      aria-label="Align Right"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().setTextAlign("right").run();
                      }}
                      data-active={editor.isActive({ textAlign: "right" }) ? "true" : "false"}
                      data-tooltip={t("tooltipAlignRight", language)}
                    >
                      <ToolbarIconSvg icon="alignRight" />
                    </button>
                  )}
                </div>
              </>
            )}

            {(visibleTools.dirRtl !== false || visibleTools.dirLtr !== false || visibleTools.outdent !== false || visibleTools.indent !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group direction-actions">
                  {visibleTools.dirRtl !== false && (
                    <button
                      aria-label="Right to left"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().setBlockDirection("rtl").run();
                      }}
                      data-active={activeBlockDir === "rtl" ? "true" : "false"}
                      data-tooltip={language === "ar" ? "اتجاه من اليمين لليسار" : "Right-to-left"}
                    >
                      <ToolbarIconSvg icon="dirRtl" />
                    </button>
                  )}
                  {visibleTools.dirLtr !== false && (
                    <button
                      aria-label="Left to right"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().setBlockDirection("ltr").run();
                      }}
                      data-active={activeBlockDir === "ltr" ? "true" : "false"}
                      data-tooltip={language === "ar" ? "اتجاه من اليسار لليمين" : "Left-to-right"}
                    >
                      <ToolbarIconSvg icon="dirLtr" />
                    </button>
                  )}
                  {visibleTools.outdent !== false && (
                    <button
                      aria-label="Decrease indent"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().outdent().run();
                      }}
                      data-tooltip={language === "ar" ? "تقليل الإزاحة" : "Decrease indent"}
                    >
                      <ToolbarIconSvg icon="indentDecrease" />
                    </button>
                  )}
                  {visibleTools.indent !== false && (
                    <button
                      aria-label="Increase indent"
                      className="toolbar-icon-button"
                      type="button"
                      disabled={!hasSelectedNote || isTrashView}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        editor.chain().focus().indent().run();
                      }}
                      data-tooltip={language === "ar" ? "زيادة الإزاحة" : "Increase indent"}
                    >
                      <ToolbarIconSvg icon="indentIncrease" />
                    </button>
                  )}
                </div>
              </>
            )}

            {(visibleTools.horizontalRule !== false || visibleTools.table !== false) && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group insert-actions">
                  {visibleTools.horizontalRule !== false && (
                    <div className="divider-control" ref={dividerControlRef}>
                      <button
                        aria-label="Horizontal rule"
                        className="toolbar-icon-button divider-main-button"
                        type="button"
                        disabled={!hasSelectedNote || isTrashView}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          insertDivider("thin");
                        }}
                        data-active={selectedDividerVariant ? "true" : "false"}
                        data-tooltip={language === "ar" ? "خط فاصل" : "Divider"}
                      >
                        <ToolbarIconSvg icon="horizontalRule" />
                      </button>
                      <button
                        aria-expanded={isDividerMenuOpen}
                        aria-haspopup="menu"
                        aria-label={language === "ar" ? "أنواع الخط الفاصل" : "Divider variants"}
                        className="toolbar-icon-button divider-menu-button"
                        type="button"
                        disabled={!hasSelectedNote || isTrashView}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsDividerMenuOpen((open) => !open);
                        }}
                        data-active={isDividerMenuOpen ? "true" : "false"}
                        data-tooltip={language === "ar" ? "أنواع الخط الفاصل" : "Divider variants"}
                      >
                        <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true">
                          <path
                            d="m7 10 5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                      {isDividerMenuOpen && (
                        <div
                          className="divider-variant-menu"
                          dir={language === "ar" ? "rtl" : "ltr"}
                          role="menu"
                        >
                          {DIVIDER_VARIANTS.map((variant) => (
                            <button
                              aria-label={getDividerVariantLabel(variant, language)}
                              className="divider-variant-item"
                              data-selected={selectedDividerVariant === variant ? "true" : "false"}
                              key={variant}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                applyDividerVariant(variant);
                              }}
                              role="menuitemradio"
                              type="button"
                            >
                              <span className="divider-variant-preview" data-variant={variant} />
                              <span className="divider-variant-label">
                                {getDividerVariantLabel(variant, language)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {visibleTools.table !== false && (
                    <>
                      <button
                        aria-label="Insert table"
                        className="toolbar-icon-button"
                        type="button"
                        disabled={!hasSelectedNote || isTrashView}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                            .run();
                        }}
                        data-active={isCellSelected ? "true" : "false"}
                        data-tooltip={language === "ar" ? "إدراج جدول" : "Insert table"}
                      >
                        <ToolbarIconSvg icon="table" />
                      </button>
                      {isCellSelected && (
                        <>
                          <button
                            aria-label="Add row"
                            className="toolbar-icon-button"
                            type="button"
                            disabled={isTrashView}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              editor.chain().focus().addRowAfter().run();
                            }}
                            data-tooltip={language === "ar" ? "إضافة صف" : "Add row"}
                          >
                            <ToolbarIconSvg icon="tableRowAdd" />
                          </button>
                          <button
                            aria-label="Add column"
                            className="toolbar-icon-button"
                            type="button"
                            disabled={isTrashView}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              editor.chain().focus().addColumnAfter().run();
                            }}
                            data-tooltip={language === "ar" ? "إضافة عمود" : "Add column"}
                          >
                            <ToolbarIconSvg icon="tableColAdd" />
                          </button>
                          <button
                            aria-label="Delete row"
                            className="toolbar-icon-button"
                            type="button"
                            disabled={isTrashView}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              editor.chain().focus().deleteRow().run();
                            }}
                            data-tooltip={language === "ar" ? "حذف صف" : "Delete row"}
                          >
                            <ToolbarIconSvg icon="tableRowDelete" />
                          </button>
                          <button
                            aria-label="Delete column"
                            className="toolbar-icon-button"
                            type="button"
                            disabled={isTrashView}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              editor.chain().focus().deleteColumn().run();
                            }}
                            data-tooltip={language === "ar" ? "حذف عمود" : "Delete column"}
                          >
                            <ToolbarIconSvg icon="tableColDelete" />
                          </button>
                          <button
                            aria-label="Delete table"
                            className="toolbar-icon-button"
                            type="button"
                            disabled={isTrashView}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              editor.chain().focus().deleteTable().run();
                            }}
                            data-tooltip={language === "ar" ? "حذف الجدول" : "Delete table"}
                          >
                            <ToolbarIconSvg icon="tableDelete" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {visibleTools.clear !== false && (
              <>
                <div className="toolbar-divider" />
                <div className="toolbar-group clear-actions">
                  <button
                    aria-label="Clear formatting"
                    className="toolbar-icon-button"
                    type="button"
                    disabled={!hasSelectedNote || isTrashView}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      editor
                        .chain()
                        .focus()
                        .clearNodes()
                        .unsetAllMarks()
                        .unsetColor()
                        .unsetFontFamily()
                        .unsetFontSize()
                        .unsetLink()
                        .run();
                    }}
                    data-tooltip={t("tooltipClearFormatting", language)}
                  >
                    <ToolbarIconSvg icon="clear" />
                  </button>
                </div>
              </>
            )}

            <div className="toolbar-divider" />
            <div className="toolbar-arrange-container" style={{ position: "relative" }}>
              <button
                ref={arrangeButtonRef}
                aria-label={language === "ar" ? "تخصيص شريط الأدوات" : "Customize toolbar"}
                className="toolbar-icon-button"
                type="button"
                onClick={() => {
                  if (!isArrangeOpen && arrangeButtonRef.current) {
                    const r = arrangeButtonRef.current.getBoundingClientRect();
                    setArrangePos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                  }
                  setIsArrangeOpen(!isArrangeOpen);
                }}
                data-active={isArrangeOpen ? "true" : "false"}
                data-tooltip={language === "ar" ? "تخصيص شريط الأدوات" : "Customize toolbar"}
              >
                <SlidersIcon />
              </button>
              {isArrangeOpen && arrangePos && createPortal(
                <div
                  className="toolbar-arrange-popover"
                  ref={arrangePopoverRef}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  style={{
                    position: "fixed",
                    top: arrangePos.top,
                    right: arrangePos.right,
                    insetInlineEnd: "auto",
                  }}
                >
                  <div className="arrange-popover-header">
                    {language === "ar" ? "تخصيص شريط الأدوات" : "Customize Toolbar"}
                  </div>
                  <div className="arrange-popover-groups">
                    {TOOL_GROUPS.map((group) => (
                      <div key={group.id} className="arrange-popover-group">
                        <div className="arrange-popover-group-title">
                          {language === "ar" ? group.labelAr : group.labelEn}
                        </div>
                        <div className="arrange-popover-group-items">
                          {group.tools.map((toolId) => (
                            <label key={toolId} className="arrange-popover-item">
                              <input
                                type="checkbox"
                                checked={visibleTools[toolId] !== false}
                                onChange={() => handleToggleTool(toolId)}
                              />
                              <span>{toolLabel(toolId, language)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="arrange-popover-actions">
                    <button
                      className="arrange-btn-reset"
                      type="button"
                      onClick={handleResetTools}
                    >
                      {language === "ar" ? "إعادة ضبط" : "Reset"}
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </>
        )}
      </div>

      {hasSelectedNote ? (
        <div
          className={`note-editor-content-wrapper${
            isEditorEmpty ? " is-editor-empty" : ""
          }`}
          data-readonly={isTrashView ? "true" : "false"}
          dir={editorDirection}
          onContextMenu={handleEditorContextMenu}
        >
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="editor-placeholder">
          <div className="editor-placeholder-content">
            <span aria-hidden="true" style={{ fontSize: "32px" }}>📔</span>
            <p>{t("editorPlaceholder", language)}</p>
            <span>{t("editorPlaceholderSubtitle", language)}</span>
          </div>
        </div>
      )}

      {quickCopy && (
        <button
          className="quick-copy-button"
          onClick={() => {
            void copyPlainText(quickCopy.text).finally(() => {
              setQuickCopy(null);
            });
          }}
          onMouseDown={(event) => event.preventDefault()}
          style={{ left: quickCopy.left, top: quickCopy.top }}
          type="button"
        >
          {language === "ar" ? "نسخ" : "Copy"}
        </button>
      )}

      {/* Link Dialog */}
      <LinkDialog
        isOpen={isLinkDialogOpen}
        initialUrl={editor?.getAttributes("link").href || ""}
        language={language}
        onCancel={() => setIsLinkDialogOpen(false)}
        onConfirm={handleLinkConfirm}
        onRemove={handleLinkRemove}
      />

      {editorMenuPos && (
        <EditorContextMenu
          x={editorMenuPos.x}
          y={editorMenuPos.y}
          nodes={getContextMenuNodes()}
          rtl={language === "ar"}
          onClose={() => setEditorMenuPos(null)}
        />
      )}
    </section>
  );
}
