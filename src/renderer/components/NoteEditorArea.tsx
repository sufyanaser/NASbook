import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import { TextSelection } from "@tiptap/pm/state";
import { DOMSerializer } from "@tiptap/pm/model";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../extensions/FontSize";
import { LinkDialog } from "./LinkDialog";
import { EditorContextMenu, type MenuNode } from "./EditorContextMenu";
import { htmlToMarkdown, toSafeFilename } from "../markdown";
import type { NoteRecord } from "../../shared/ipc";
import { isLightLikeTheme } from "../../shared/settings";
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
  readonly fontSize: EditorFontSize;
  readonly isTrashView: boolean;
  readonly saveStatus: string;
  readonly selectedNote: NoteRecord | null;
  readonly showMetadata: boolean;
  readonly theme: AppTheme;
  readonly language: AppLanguage;
  readonly onContentChange: (content: string) => void;
  readonly onDeletePermanent: () => void;
  readonly onDeleteToTrash: () => void;
  readonly onRestore: () => void;
  readonly onSave: () => void;
  readonly onToggleTheme: () => void;
  readonly onTitleChange: (title: string) => void;
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

function getFontFamilyShortLabel(font: string): string {
  if (font.includes("IBM Plex Sans Arabic")) return "IB";
  if (font.startsWith("Segoe")) return "Se";
  if (font.startsWith("Arial")) return "Ar";
  if (font.startsWith("Georgia")) return "Ge";
  if (font.startsWith("Consolas")) return "Co";
  if (font === "System") return "F";
  return font.slice(0, 2);
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

const CODE_BLOCK_FONT_FAMILIES = ["mono", "sans", "serif", "arabic", "system"] as const;
type CodeBlockFontFamily = (typeof CODE_BLOCK_FONT_FAMILIES)[number];
function isCodeBlockFontFamily(value: string | null): value is CodeBlockFontFamily {
  return value !== null && CODE_BLOCK_FONT_FAMILIES.includes(value as CodeBlockFontFamily);
}

const CODE_BLOCK_FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
type CodeBlockFontSize = (typeof CODE_BLOCK_FONT_SIZES)[number];
function isCodeBlockFontSize(value: string | null): value is CodeBlockFontSize {
  return value !== null && CODE_BLOCK_FONT_SIZES.includes(value as CodeBlockFontSize);
}

function codeBlockBoxColorLabel(
  color: CodeBlockBoxColor,
  language: AppLanguage,
): string {
  const labels: Record<CodeBlockBoxColor, { ar: string; en: string }> = {
    default: { ar: "افتراضي", en: "Default" },
    "light-gray": { ar: "رمادي فاتح", en: "Light Gray" },
    "light-blue": { ar: "أزرق فاتح", en: "Light Blue" },
    "light-green": { ar: "أخضر فاتح", en: "Light Green" },
    "light-amber": { ar: "كهرماني فاتح", en: "Light Amber" },
    "light-rose": { ar: "وردي فاتح", en: "Light Rose" },
  };
  return language === "ar" ? labels[color].ar : labels[color].en;
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
      fontFamily: {
        default: "mono",
        parseHTML: (element) => {
          const value = element.getAttribute("data-font-family");
          return isCodeBlockFontFamily(value) ? value : "mono";
        },
        renderHTML: (attributes) => ({
          "data-font-family": isCodeBlockFontFamily(attributes.fontFamily)
            ? attributes.fontFamily
            : "mono",
        }),
      },
      fontSize: {
        default: "md",
        parseHTML: (element) => {
          const value = element.getAttribute("data-font-size");
          return isCodeBlockFontSize(value) ? value : "md";
        },
        renderHTML: (attributes) => ({
          "data-font-size": isCodeBlockFontSize(attributes.fontSize)
            ? attributes.fontSize
            : "md",
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
  readonly options: readonly { readonly value: T; readonly label: string; readonly className?: string }[];
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
              className={`custom-dropdown-item ${option.className || ""}`}
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
}: {
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
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

  const swatches = [
    { name: "Reset", value: null, hex: "transparent" },
    { name: "White", value: "#f4f4f5", hex: "#f4f4f5" },
    { name: "Gray", value: "#71717a", hex: "#71717a" },
    { name: "Red", value: "#ef4444", hex: "#ef4444" },
    { name: "Amber", value: "#f59e0b", hex: "#f59e0b" },
    { name: "Green", value: "#10b981", hex: "#10b981" },
    { name: "Blue", value: "#3b82f6", hex: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6", hex: "#8b5cf6" },
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
        <svg viewBox="0 0 24 24" className="toolbar-button-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35825 19.5 5.5 20 5.5 20.5C5.5 21.3284 6.17157 22 7 22H12Z" />
          <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
        </svg>
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
                    case "Amber": return "كهرماني";
                    case "Green": return "أخضر";
                    case "Blue": return "أزرق";
                    case "Purple": return "أرجواني";
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

export function NoteEditorArea({
  activeCategoryName,
  draftContent,
  draftTitle,
  editorDensity,
  editorDirection,
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
  onToggleTheme,
  onTitleChange,
}: NoteEditorAreaProps): JSX.Element {
  const hasSelectedNote = selectedNote !== null;
  const isSettingContentRef = useRef(false);
  const loadedNoteIdRef = useRef<number | null>(null);
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [quickCopy, setQuickCopy] = useState<QuickCopyState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
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
    ],
    content: draftContent,
    editable: !isTrashView && hasSelectedNote,
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
      onContentChange(content);
    },
  });

  // Keep editor read-only status in sync
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isTrashView && hasSelectedNote);
    }
  }, [editor, isTrashView, hasSelectedNote]);

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

  // Close the editor context menu whenever the open note changes.
  useEffect(() => {
    setContextMenu(null);
  }, [selectedNote?.id]);

  const isEditorEmpty = editor
    ? editor.getText().trim() === "" ||
      editor.getHTML() === "<p></p>" ||
      editor.getHTML() === "<p><br></p>" ||
      editor.getHTML() === "<p><br class=\"ProseMirror-trailingBreak\"></p>"
    : true;
  const isLightMode = isLightLikeTheme(theme);

  // Dropdown option maps
  const fontFamilies = [
    { value: "System", label: language === "ar" ? "نظام" : "System" },
    { value: "Segoe UI", label: "Segoe UI" },
    { value: "Arial", label: "Arial" },
    { value: "IBM Plex Sans Arabic Local", label: "IBM Plex Sans Arabic Local" },
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
    { value: "paragraph", label: language === "ar" ? "فقرة" : "Paragraph", className: "text-type-option text-type-option--paragraph" },
    { value: "h1", label: language === "ar" ? "عنوان 1" : "Heading 1", className: "text-type-option text-type-option--h1" },
    { value: "h2", label: language === "ar" ? "عنوان 2" : "Heading 2", className: "text-type-option text-type-option--h2" },
    { value: "h3", label: language === "ar" ? "عنوان 3" : "Heading 3", className: "text-type-option text-type-option--h3" },
    { value: "h4", label: language === "ar" ? "عنوان 4" : "Heading 4", className: "text-type-option text-type-option--h4" },
    { value: "h5", label: language === "ar" ? "عنوان 5" : "Heading 5", className: "text-type-option text-type-option--h5" },
    { value: "h6", label: language === "ar" ? "عنوان 6" : "Heading 6", className: "text-type-option text-type-option--h6" },
  ];

  const activeFontFamily = editor
    ? editor.getAttributes("textStyle").fontFamily || "System"
    : "System";

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

  const activeTextColor = editor
    ? editor.getAttributes("textStyle").color || null
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

  const activeCodeBlockFontFamilyVal = editor && editor.isActive("codeBlock")
    ? editor.getAttributes("codeBlock").fontFamily
    : "mono";
  const activeCodeBlockFontFamily = isCodeBlockFontFamily(activeCodeBlockFontFamilyVal)
    ? activeCodeBlockFontFamilyVal
    : "mono";

  const activeCodeBlockFontSizeVal = editor && editor.isActive("codeBlock")
    ? editor.getAttributes("codeBlock").fontSize
    : "md";
  const activeCodeBlockFontSize = isCodeBlockFontSize(activeCodeBlockFontSizeVal)
    ? activeCodeBlockFontSizeVal
    : "md";

  const codeBlockDirectionOptions: {
    readonly value: CodeBlockDirection;
    readonly label: string;
  }[] = [
    { value: "auto", label: language === "ar" ? "تلقائي" : "Auto" },
    { value: "ltr", label: "LTR" },
    { value: "rtl", label: "RTL" },
  ];

  const codeBlockFontFamilyOptions = [
    { value: "mono", label: language === "ar" ? "أحادي" : "Mono" },
    { value: "sans", label: language === "ar" ? "سنس" : "Sans" },
    { value: "serif", label: language === "ar" ? "سيريف" : "Serif" },
    { value: "arabic", label: language === "ar" ? "عربي" : "Arabic" },
    { value: "system", label: language === "ar" ? "نظام" : "System" },
  ] as const;

  const codeBlockFontFamilyShortLabels: Record<CodeBlockFontFamily, string> = {
    mono: language === "ar" ? "أحادي" : "Mono",
    sans: language === "ar" ? "سنس" : "Sans",
    serif: language === "ar" ? "سيريف" : "Serif",
    arabic: language === "ar" ? "عربي" : "Arabic",
    system: language === "ar" ? "نظام" : "Sys",
  };

  const codeBlockFontSizeOptions = [
    { value: "sm", label: language === "ar" ? "صغير" : "Small" },
    { value: "md", label: language === "ar" ? "متوسط" : "Medium" },
    { value: "lg", label: language === "ar" ? "كبير" : "Large" },
    { value: "xl", label: language === "ar" ? "ضخم" : "X Large" },
  ] as const;

  const codeBlockFontSizeShortLabels: Record<CodeBlockFontSize, string> = {
    sm: "SM",
    md: "MD",
    lg: "LG",
    xl: "XL",
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

  const handleEditorContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
  ): void => {
    if (!editor) {
      return;
    }
    // Suppress the native Chromium menu and the app-level menu, but only here
    // inside the editor surface.
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const buildContextMenuNodes = (): MenuNode[] => {
    const L = (ar: string, en: string): string => (language === "ar" ? ar : en);
    const ed = editor;
    if (!ed) {
      return [];
    }

    const editable = !isTrashView && hasSelectedNote;
    const hasSelection = !ed.state.selection.empty;
    const inCodeBlock = ed.isActive("codeBlock");
    const hasLink = ed.isActive("link");

    const selectAllInContext = (): void => {
      if (inCodeBlock) {
        const { state, view } = ed;
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === "codeBlock") {
            const start = $from.start(depth);
            const end = $from.end(depth);
            view.focus();
            view.dispatch(
              state.tr.setSelection(TextSelection.create(state.doc, start, end)),
            );
            return;
          }
        }
      }
      ed.chain().focus().selectAll().run();
    };

    const selectCurrentBlock = (): void => {
      const { state, view } = ed;
      const { $from } = state.selection;
      let depth = $from.depth;
      while (depth > 0 && !$from.node(depth).isTextblock) {
        depth -= 1;
      }
      if (depth <= 0) {
        ed.chain().focus().selectAll().run();
        return;
      }
      const start = $from.start(depth);
      const end = $from.end(depth);
      view.focus();
      view.dispatch(
        state.tr.setSelection(TextSelection.create(state.doc, start, end)),
      );
    };

    const copySelectedText = (): void => {
      const { state } = ed;
      const { from, to } = state.selection;
      void copyPlainText(state.doc.textBetween(from, to, "\n"));
    };

    const copyCurrentCodeBlock = (): void => {
      const { $from } = ed.state.selection;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === "codeBlock") {
          void copyPlainText($from.node(depth).textContent);
          return;
        }
      }
    };

    const copySelectionAsMarkdown = (): void => {
      const { state } = ed;
      const { from, to, empty } = state.selection;
      if (empty) {
        return;
      }
      const slice = state.doc.slice(from, to);
      const fragment = DOMSerializer.fromSchema(ed.schema).serializeFragment(
        slice.content,
      );
      const container = document.createElement("div");
      container.appendChild(fragment);
      void copyPlainText(htmlToMarkdown(container.innerHTML));
    };

    const copyNoteAsMarkdown = (): void => {
      void copyPlainText(htmlToMarkdown(ed.getHTML()));
    };

    const exportCurrentNote = (): void => {
      void window.nasNotesbook?.markdown.exportFile({
        defaultFilename: `${toSafeFilename(draftTitle || "note")}.md`,
        markdown: htmlToMarkdown(ed.getHTML()),
      });
    };

    const pastePlainText = (): void => {
      void navigator.clipboard
        .readText()
        .then((text) => {
          ed.chain().focus().insertContent(text).run();
        })
        .catch(() => {
          /* clipboard unavailable */
        });
    };

    const execClipboard = (command: "cut" | "copy"): void => {
      if (!hasSelection) {
        return;
      }
      ed.commands.focus();
      document.execCommand(command);
    };

    const focusTitle = (): void => {
      const el = titleInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    };

    const setCodeBlockAttr = (attr: string, value: string): void => {
      ed.chain().focus().updateAttributes("codeBlock", { [attr]: value }).run();
    };

    const headingNode = (
      id: string,
      label: string,
      value: string,
    ): MenuNode => ({
      kind: "item",
      id,
      label,
      checked: activeHeadingType === value,
      disabled: !editable,
      onSelect: () => {
        if (value === "paragraph") {
          ed.chain().focus().setParagraph().run();
        } else {
          const level = Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
          ed.chain().focus().toggleHeading({ level }).run();
        }
      },
    });

    return [
      { kind: "header", id: "h-edit", label: L("تحرير", "Editing") },
      {
        kind: "item",
        id: "cut",
        label: L("قص", "Cut"),
        shortcut: "Ctrl+X",
        disabled: !editable || !hasSelection,
        onSelect: () => execClipboard("cut"),
      },
      {
        kind: "item",
        id: "copy",
        label: L("نسخ", "Copy"),
        shortcut: "Ctrl+C",
        disabled: !hasSelection,
        onSelect: () => execClipboard("copy"),
      },
      {
        kind: "item",
        id: "paste",
        label: L("لصق", "Paste"),
        shortcut: "Ctrl+V",
        disabled: !editable,
        onSelect: pastePlainText,
      },
      {
        kind: "item",
        id: "paste-plain",
        label: L("لصق كنص عادي", "Paste as plain text"),
        shortcut: "Ctrl+Shift+V",
        disabled: !editable,
        onSelect: pastePlainText,
      },
      { kind: "separator", id: "sep-1" },
      { kind: "header", id: "h-sel", label: L("التحديد", "Selection") },
      {
        kind: "item",
        id: "select-all",
        label: L("تحديد الكل", "Select All"),
        shortcut: "Ctrl+A",
        disabled: !hasSelectedNote,
        onSelect: selectAllInContext,
      },
      {
        kind: "item",
        id: "select-block",
        label: L("تحديد الكتلة", "Select Block"),
        disabled: !hasSelectedNote,
        onSelect: selectCurrentBlock,
      },
      {
        kind: "item",
        id: "copy-selected",
        label: L("نسخ النص المحدد", "Copy Selected Text"),
        disabled: !hasSelection,
        onSelect: copySelectedText,
      },
      { kind: "separator", id: "sep-2" },
      {
        kind: "item",
        id: "markdown",
        label: L("ماركداون", "Markdown"),
        submenu: [
          {
            kind: "item",
            id: "md-import",
            label: L("استيراد Markdown", "Import Markdown"),
            disabled: true,
          },
          {
            kind: "item",
            id: "md-export-note",
            label: L("تصدير الملاحظة الحالية", "Export Current Note"),
            disabled: !hasSelectedNote,
            onSelect: exportCurrentNote,
          },
          {
            kind: "item",
            id: "md-export-cat",
            label: L("تصدير التصنيف الحالي", "Export Current Category"),
            disabled: true,
          },
          { kind: "separator", id: "md-sep" },
          {
            kind: "item",
            id: "md-copy-sel",
            label: L("نسخ التحديد كـ Markdown", "Copy Selection as Markdown"),
            disabled: !hasSelection,
            onSelect: copySelectionAsMarkdown,
          },
          {
            kind: "item",
            id: "md-copy-note",
            label: L("نسخ الملاحظة كـ Markdown", "Copy Note as Markdown"),
            disabled: !hasSelectedNote,
            onSelect: copyNoteAsMarkdown,
          },
        ],
      },
      {
        kind: "item",
        id: "format",
        label: L("تنسيق", "Format"),
        disabled: !editable,
        submenu: [
          headingNode("fmt-p", L("فقرة", "Paragraph"), "paragraph"),
          headingNode("fmt-h1", L("عنوان 1", "Heading 1"), "h1"),
          headingNode("fmt-h2", L("عنوان 2", "Heading 2"), "h2"),
          headingNode("fmt-h3", L("عنوان 3", "Heading 3"), "h3"),
          headingNode("fmt-h4", L("عنوان 4", "Heading 4"), "h4"),
          headingNode("fmt-h5", L("عنوان 5", "Heading 5"), "h5"),
          headingNode("fmt-h6", L("عنوان 6", "Heading 6"), "h6"),
          { kind: "separator", id: "fmt-sep-1" },
          {
            kind: "item",
            id: "fmt-bold",
            label: L("غامق", "Bold"),
            shortcut: "Ctrl+B",
            checked: ed.isActive("bold"),
            onSelect: () => ed.chain().focus().toggleBold().run(),
          },
          {
            kind: "item",
            id: "fmt-italic",
            label: L("مائل", "Italic"),
            shortcut: "Ctrl+I",
            checked: ed.isActive("italic"),
            onSelect: () => ed.chain().focus().toggleItalic().run(),
          },
          {
            kind: "item",
            id: "fmt-underline",
            label: L("تسطير", "Underline"),
            shortcut: "Ctrl+U",
            checked: ed.isActive("underline"),
            onSelect: () => ed.chain().focus().toggleUnderline().run(),
          },
          {
            kind: "item",
            id: "fmt-strike",
            label: L("يتوسطه خط", "Strike"),
            checked: ed.isActive("strike"),
            onSelect: () => ed.chain().focus().toggleStrike().run(),
          },
          {
            kind: "item",
            id: "fmt-code",
            label: L("كود سطري", "Inline Code"),
            checked: ed.isActive("code"),
            onSelect: () => ed.chain().focus().toggleCode().run(),
          },
          {
            kind: "item",
            id: "fmt-quote",
            label: L("اقتباس", "Blockquote"),
            checked: ed.isActive("blockquote"),
            onSelect: () => ed.chain().focus().toggleBlockquote().run(),
          },
          { kind: "separator", id: "fmt-sep-2" },
          {
            kind: "item",
            id: "fmt-bullet",
            label: L("قائمة نقطية", "Bullet List"),
            checked: ed.isActive("bulletList"),
            onSelect: () => ed.chain().focus().toggleBulletList().run(),
          },
          {
            kind: "item",
            id: "fmt-ordered",
            label: L("قائمة مرقمة", "Ordered List"),
            checked: ed.isActive("orderedList"),
            onSelect: () => ed.chain().focus().toggleOrderedList().run(),
          },
          { kind: "separator", id: "fmt-sep-3" },
          {
            kind: "item",
            id: "fmt-align-left",
            label: L("محاذاة لليسار", "Align Left"),
            checked: ed.isActive({ textAlign: "left" }),
            onSelect: () => ed.chain().focus().setTextAlign("left").run(),
          },
          {
            kind: "item",
            id: "fmt-align-center",
            label: L("توسيط", "Align Center"),
            checked: ed.isActive({ textAlign: "center" }),
            onSelect: () => ed.chain().focus().setTextAlign("center").run(),
          },
          {
            kind: "item",
            id: "fmt-align-right",
            label: L("محاذاة لليمين", "Align Right"),
            checked: ed.isActive({ textAlign: "right" }),
            onSelect: () => ed.chain().focus().setTextAlign("right").run(),
          },
          { kind: "separator", id: "fmt-sep-4" },
          {
            kind: "item",
            id: "fmt-clear",
            label: L("مسح التنسيق", "Clear Formatting"),
            onSelect: () =>
              ed.chain().focus().clearNodes().unsetAllMarks().run(),
          },
        ],
      },
      {
        kind: "item",
        id: "codeblock",
        label: L("كتلة كود", "Code Block"),
        disabled: !editable,
        submenu: [
          {
            kind: "item",
            id: "cb-toggle",
            label: L("تبديل كتلة الكود", "Toggle Code Block"),
            checked: inCodeBlock,
            onSelect: () => ed.chain().focus().toggleCodeBlock().run(),
          },
          {
            kind: "item",
            id: "cb-copy",
            label: L("نسخ كتلة الكود", "Copy Code Block"),
            disabled: !inCodeBlock,
            onSelect: copyCurrentCodeBlock,
          },
          {
            kind: "item",
            id: "cb-select",
            label: L("تحديد كتلة الكود", "Select Code Block"),
            disabled: !inCodeBlock,
            onSelect: selectAllInContext,
          },
          { kind: "separator", id: "cb-sep-1" },
          {
            kind: "item",
            id: "cb-dir",
            label: L("الاتجاه", "Direction"),
            disabled: !inCodeBlock,
            submenu: codeBlockDirectionOptions.map((opt) => ({
              kind: "item" as const,
              id: `cb-dir-${opt.value}`,
              label: opt.label,
              checked: activeCodeBlockDir === opt.value,
              onSelect: () => setCodeBlockAttr("dir", opt.value),
            })),
          },
          {
            kind: "item",
            id: "cb-color",
            label: L("لون الصندوق", "Box Color"),
            disabled: !inCodeBlock,
            submenu: CODE_BLOCK_BOX_COLORS.map((color) => ({
              kind: "item" as const,
              id: `cb-color-${color}`,
              label: codeBlockBoxColorLabel(color, language),
              checked: activeCodeBlockColor === color,
              onSelect: () => setCodeBlockAttr("boxColor", color),
            })),
          },
          {
            kind: "item",
            id: "cb-font",
            label: L("الخط", "Font Family"),
            disabled: !inCodeBlock,
            submenu: codeBlockFontFamilyOptions.map((opt) => ({
              kind: "item" as const,
              id: `cb-font-${opt.value}`,
              label: opt.label,
              checked: activeCodeBlockFontFamily === opt.value,
              onSelect: () => setCodeBlockAttr("fontFamily", opt.value),
            })),
          },
          {
            kind: "item",
            id: "cb-size",
            label: L("حجم الخط", "Font Size"),
            disabled: !inCodeBlock,
            submenu: codeBlockFontSizeOptions.map((opt) => ({
              kind: "item" as const,
              id: `cb-size-${opt.value}`,
              label: opt.label,
              checked: activeCodeBlockFontSize === opt.value,
              onSelect: () => setCodeBlockAttr("fontSize", opt.value),
            })),
          },
        ],
      },
      { kind: "separator", id: "sep-3" },
      { kind: "header", id: "h-link", label: L("رابط", "Link") },
      {
        kind: "item",
        id: "link-add",
        label: L("إضافة/تعديل رابط", "Add/Edit Link"),
        shortcut: "Ctrl+K",
        disabled: !editable,
        onSelect: () => setIsLinkDialogOpen(true),
      },
      {
        kind: "item",
        id: "link-remove",
        label: L("إزالة الرابط", "Remove Link"),
        disabled: !editable || !hasLink,
        onSelect: handleLinkRemove,
      },
      { kind: "separator", id: "sep-4" },
      { kind: "header", id: "h-note", label: L("الملاحظة", "Note") },
      {
        kind: "item",
        id: "note-save",
        label: L("حفظ الآن", "Save Now"),
        shortcut: "Ctrl+S",
        disabled: !editable,
        onSelect: onSave,
      },
      {
        kind: "item",
        id: "note-copy-title",
        label: L("نسخ عنوان الملاحظة", "Copy Note Title"),
        disabled: !hasSelectedNote,
        onSelect: () => void copyPlainText(draftTitle),
      },
      {
        kind: "item",
        id: "note-rename",
        label: L("إعادة تسمية الملاحظة", "Rename Note"),
        disabled: !editable,
        onSelect: focusTitle,
      },
      {
        kind: "item",
        id: "note-delete",
        label: L("نقل إلى المهملات", "Delete Note to Trash"),
        danger: true,
        disabled: !hasSelectedNote || isTrashView,
        onSelect: onDeleteToTrash,
      },
    ];
  };

  return (
    <section
      className="editor-area"
      aria-label="Editor placeholder"
      data-editor-density={editorDensity}
      data-editor-font-size={fontSize}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <header className="editor-header">
        <div style={{ flex: 1 }}>
          <span className="editor-eyebrow">{activeCategoryName}</span>
          <input
            ref={titleInputRef}
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
        <div className="editor-header-actions">
          <button
            aria-label={isLightMode ? (language === "ar" ? "تبديل للسمة الداكنة" : "Switch to dark theme") : (language === "ar" ? "تبديل للسمة الفاتحة" : "Switch to light theme")}
            className="theme-toggle"
            data-light={isLightMode ? "true" : "false"}
            data-tooltip={t("tooltipTheme", language)}
            onClick={onToggleTheme}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
          <div
            className="direction-chip"
            data-tooltip={t("tooltipDirection", language)}
          >
            {editorDirection.toUpperCase()}
          </div>
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
            <div className="toolbar-divider" />
            
            {/* Group 3: Font Family / Font Size / Heading */}
            <div className="toolbar-group font-and-type-actions">
              <Dropdown
                label={getFontFamilyShortLabel(activeFontFamily)}
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
            </div>

            <div className="toolbar-divider" />

            {/* Group 4: Bold / Italic / Underline / Text Color / Link */}
            <div className="toolbar-group formatting-actions">
              <button
                aria-label="Bold"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleBold().run()}
                data-active={editor.isActive("bold") ? "true" : "false"}
                data-tooltip={t("tooltipBold", language)}
              >
                <ToolbarIconSvg icon="bold" />
              </button>
              <button
                aria-label="Italic"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                data-active={editor.isActive("italic") ? "true" : "false"}
                data-tooltip={t("tooltipItalic", language)}
              >
                <ToolbarIconSvg icon="italic" />
              </button>
              <button
                aria-label="Underline"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                data-active={editor.isActive("underline") ? "true" : "false"}
                data-tooltip={t("tooltipUnderline", language)}
              >
                <ToolbarIconSvg icon="underline" />
              </button>
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
              <button
                aria-label={language === "ar" ? "كتلة كود" : "Code block"}
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
              <Dropdown
                label={codeBlockFontFamilyShortLabels[activeCodeBlockFontFamily] || "Mono"}
                value={activeCodeBlockFontFamily}
                options={codeBlockFontFamilyOptions}
                disabled={!hasSelectedNote || isTrashView}
                tooltip={language === "ar" ? "خط كتلة الكود" : "Code block font family"}
                className="code-font-family-dropdown"
                onChange={(val) => {
                  const chain = editor.chain().focus();
                  if (!editor.isActive("codeBlock")) {
                    chain.setCodeBlock();
                  }
                  chain.updateAttributes("codeBlock", { fontFamily: val }).run();
                }}
              />
              <Dropdown
                label={codeBlockFontSizeShortLabels[activeCodeBlockFontSize] || "MD"}
                value={activeCodeBlockFontSize}
                options={codeBlockFontSizeOptions}
                disabled={!hasSelectedNote || isTrashView}
                tooltip={language === "ar" ? "حجم خط كتلة الكود" : "Code block font size"}
                className="code-font-size-dropdown"
                onChange={(val) => {
                  const chain = editor.chain().focus();
                  if (!editor.isActive("codeBlock")) {
                    chain.setCodeBlock();
                  }
                  chain.updateAttributes("codeBlock", { fontSize: val }).run();
                }}
              />
            </div>

            <div className="toolbar-divider" />

            {/* Group 5: Bullet / Numbered / Align Left / Align Center / Align Right */}
            <div className="toolbar-group layout-actions">
              <button
                aria-label="Bullets"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                data-active={editor.isActive("bulletList") ? "true" : "false"}
                data-tooltip={t("tooltipBullets", language)}
              >
                <ToolbarIconSvg icon="bullets" />
              </button>
              <button
                aria-label="Numbered"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                data-active={editor.isActive("orderedList") ? "true" : "false"}
                data-tooltip={t("tooltipNumbered", language)}
              >
                <ToolbarIconSvg icon="numbered" />
              </button>
              <button
                aria-label="Align Left"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                data-active={editor.isActive({ textAlign: "left" }) ? "true" : "false"}
                data-tooltip={t("tooltipAlignLeft", language)}
              >
                <ToolbarIconSvg icon="alignLeft" />
              </button>
              <button
                aria-label="Align Center"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                data-active={editor.isActive({ textAlign: "center" }) ? "true" : "false"}
                data-tooltip={t("tooltipAlignCenter", language)}
              >
                <ToolbarIconSvg icon="alignCenter" />
              </button>
              <button
                aria-label="Align Right"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                data-active={editor.isActive({ textAlign: "right" }) ? "true" : "false"}
                data-tooltip={t("tooltipAlignRight", language)}
              >
                <ToolbarIconSvg icon="alignRight" />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* Group 6: Clear Formatting */}
            <div className="toolbar-group clear-actions">
              <button
                aria-label="Clear formatting"
                className="toolbar-icon-button"
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .clearNodes()
                    .unsetAllMarks()
                    .unsetColor()
                    .unsetFontFamily()
                    .unsetFontSize()
                    .unsetLink()
                    .run()
                }
                data-tooltip={t("tooltipClearFormatting", language)}
              >
                <ToolbarIconSvg icon="clear" />
              </button>
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

      {contextMenu && editor && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodes={buildContextMenuNodes()}
          rtl={language === "ar"}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  );
}
