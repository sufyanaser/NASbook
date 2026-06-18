import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../extensions/FontSize";
import { LinkDialog } from "./LinkDialog";
import type { NoteRecord } from "../../shared/ipc";
import { isLightLikeTheme } from "../../shared/settings";
import type {
  AppTheme,
  EditorDensity,
  EditorDirection,
  EditorFontSize,
} from "../../shared/settings";

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
}: {
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly disabled?: boolean;
  readonly tooltip?: string;
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
            {swatches.map((swatch) => (
              <button
                key={swatch.name}
                className="color-swatch-button"
                data-tooltip={swatch.name}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

  const editor = useEditor({
    extensions: [
      StarterKit,
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
  const isLightMode = isLightLikeTheme(theme);

  // Dropdown option maps
  const fontFamilies = [
    { value: "System", label: "System" },
    { value: "Segoe UI", label: "Segoe UI" },
    { value: "Arial", label: "Arial" },
    { value: "IBM Plex Sans Arabic Local", label: "IBM Plex Sans Arabic Local" },
    { value: "Georgia", label: "Georgia" },
    { value: "Consolas", label: "Consolas" },
  ];

  const fontSizes = [
    { value: "Default", label: "Default" },
    { value: "13px", label: "13px" },
    { value: "15px", label: "15px" },
    { value: "17px", label: "17px" },
    { value: "20px", label: "20px" },
    { value: "24px", label: "24px" },
    { value: "32px", label: "32px" },
  ];

  const headingTypes = [
    { value: "paragraph", label: "Paragraph" },
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "h4", label: "Heading 4" },
    { value: "h5", label: "Heading 5" },
    { value: "h6", label: "Heading 6" },
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

  const activeHeadingLabel = headingTypes.find((t) => t.value === activeHeadingType)?.label || "Paragraph";

  const activeTextColor = editor
    ? editor.getAttributes("textStyle").color || null
    : null;

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
      dir={editorDirection === "ltr" ? "ltr" : "rtl"}
    >
      <header className="editor-header">
        <div style={{ flex: 1 }}>
          <span className="editor-eyebrow">{activeCategoryName}</span>
          <input
            className="note-title-input"
            disabled={!hasSelectedNote || isTrashView}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="عنوان الملاحظة..."
            type="text"
            value={draftTitle}
          />
          {hasSelectedNote && showMetadata && (
            <div className="note-metadata-row">
              {selectedNote.createdAt && (
                <span className="metadata-item">
                  أنشئت: {formatDateTime(selectedNote.createdAt)}
                </span>
              )}
              {selectedNote.updatedAt && (
                <span className="metadata-item">
                  تعديل: {formatDateTime(selectedNote.updatedAt)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="editor-header-actions">
          <button
            aria-label={isLightMode ? "Switch to dark theme" : "Switch to light theme"}
            className="theme-toggle"
            data-light={isLightMode ? "true" : "false"}
            data-tooltip="Toggle light/dark theme"
            onClick={onToggleTheme}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
          <div
            className="direction-chip"
            data-tooltip="Editor text direction"
          >
            {editorDirection.toUpperCase()}
          </div>
        </div>
      </header>

      {isTrashView && hasSelectedNote && (
        <div className="editor-trash-banner">
          <span>⚠️ هذه الملاحظة في سلة المهملات. التعديل معطل. قم باستعادة الملاحظة لتعديلها.</span>
        </div>
      )}

      <div className="editor-toolbar" aria-label="Editor toolbar">
        {/* Group 1: Save + status */}
        <div className="toolbar-group note-actions">
          {!isTrashView ? (
            <>
              <div className="note-save-group">
                <button
                  aria-label="Save"
                  className="toolbar-action-button"
                  disabled={!hasSelectedNote}
                  data-tooltip="Save — Ctrl+S"
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
                      ? "Saved"
                      : saveStatus === "Unsaved"
                      ? "Unsaved changes"
                      : saveStatus === "Saving"
                      ? "Saving"
                      : saveStatus === "Error"
                      ? "Save error"
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
                aria-label="Delete to Trash"
                className="toolbar-action-button toolbar-danger-action"
                disabled={!hasSelectedNote}
                data-tooltip="Delete to Trash"
                onClick={onDeleteToTrash}
                type="button"
              >
                <ToolbarIconSvg icon="trash" />
              </button>
            </>
          ) : (
            <>
              <button
                aria-label="Restore"
                className="toolbar-action-button"
                disabled={!hasSelectedNote}
                data-tooltip="Restore"
                onClick={onRestore}
                type="button"
              >
                <ToolbarIconSvg icon="restore" />
              </button>
              <button
                aria-label="Delete Permanently"
                className="toolbar-action-button danger-button"
                disabled={!hasSelectedNote}
                data-tooltip="Delete Permanently"
                onClick={onDeletePermanent}
                type="button"
              >
                <ToolbarIconSvg icon="deletePermanent" />
              </button>
              <div className="toolbar-divider" />
              <span
                className="save-status-pill"
                data-status="saved"
                data-tooltip="Saved"
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
                tooltip={`Font Family: ${activeFontFamily}`}
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
                tooltip={`Font Size: ${activeFontSize}`}
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
                tooltip={`Text Type: ${activeHeadingLabel}`}
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
                data-tooltip="Bold — Ctrl+B"
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
                data-tooltip="Italic — Ctrl+I"
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
                data-tooltip="Underline"
              >
                <ToolbarIconSvg icon="underline" />
              </button>
              <ColorPicker
                value={activeTextColor}
                disabled={!hasSelectedNote || isTrashView}
                tooltip="Text Color"
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
                data-tooltip="Link"
              >
                <ToolbarIconSvg icon="link" />
              </button>
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
                data-tooltip="Bullets"
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
                data-tooltip="Numbered"
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
                data-tooltip="Align Left"
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
                data-tooltip="Align Center"
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
                data-tooltip="Align Right"
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
                data-tooltip="Clear formatting"
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
        >
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="editor-placeholder" dir="rtl">
          <div className="editor-placeholder-content">
            <span aria-hidden="true" style={{ fontSize: "32px" }}>📔</span>
            <p>اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة للبدء.</p>
            <span>يمكنك التنقل بين الفئات وسلة المهملات من الشريط الجانبي.</span>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      <LinkDialog
        isOpen={isLinkDialogOpen}
        initialUrl={editor ? editor.getAttributes("link").href || "" : ""}
        onCancel={() => setIsLinkDialogOpen(false)}
        onConfirm={handleLinkConfirm}
        onRemove={handleLinkRemove}
      />
    </section>
  );
}
