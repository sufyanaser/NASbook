import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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

  const editor = useEditor({
    extensions: [StarterKit],
    content: draftContent,
    editable: !isTrashView && hasSelectedNote,
    onUpdate: ({ editor }) => {
      if (isSettingContentRef.current) {
        return;
      }
      // Save editor HTML into the existing note content/body field
      // Avoid saving meaningless empty HTML when possible
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
          // Use contentHtml if present and non-empty; fallback to contentMarkdown
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
            data-tooltip={isLightMode ? "Switch to dark theme" : "Switch to light theme"}
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
        <div className="toolbar-group note-actions">
          {!isTrashView ? (
            <>
              <div className="note-save-group">
                <button
                  disabled={!hasSelectedNote}
                  data-tooltip="Save - Ctrl+S"
                  onClick={onSave}
                  type="button"
                >
                  Save
                </button>
                <span className="save-status-pill" data-status={saveStatus.toLowerCase()}>
                  {saveStatus === "Idle"
                    ? "Saved"
                    : saveStatus === "Unsaved"
                    ? "Unsaved changes"
                    : saveStatus === "Saving"
                    ? "Saving..."
                    : saveStatus === "Saved"
                    ? "Saved"
                    : saveStatus === "Error"
                    ? "Save Error"
                    : saveStatus}
                </span>
              </div>
              <div className="toolbar-divider" />
              <button
                disabled={!hasSelectedNote}
                data-tooltip="Move note to Trash"
                onClick={onDeleteToTrash}
                type="button"
              >
                Delete to Trash
              </button>
            </>
          ) : (
            <>
              <button
                disabled={!hasSelectedNote}
                data-tooltip="Restore note"
                onClick={onRestore}
                type="button"
              >
                Restore
              </button>
              <button
                className="danger-button"
                disabled={!hasSelectedNote}
                data-tooltip="Delete permanently"
                onClick={onDeletePermanent}
                type="button"
              >
                Delete Permanently
              </button>
              <div className="toolbar-divider" />
              <span className="save-status-pill" data-status="saved">
                Saved
              </span>
            </>
          )}
        </div>

        {editor && (
          <>
            <div className="toolbar-divider" />
            <div className="toolbar-group formatting-actions">
              <button
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleBold().run()}
                data-active={editor.isActive("bold") ? "true" : "false"}
                data-tooltip="Bold - Ctrl+B"
              >
                Bold
              </button>
              <button
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                data-active={editor.isActive("italic") ? "true" : "false"}
                data-tooltip="Italic - Ctrl+I"
              >
                Italic
              </button>
              <button
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                data-active={editor.isActive("bulletList") ? "true" : "false"}
                data-tooltip="Bullet list"
              >
                Bullet list
              </button>
              <button
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                data-active={editor.isActive("orderedList") ? "true" : "false"}
                data-tooltip="Ordered list"
              >
                Ordered list
              </button>
              <button
                type="button"
                disabled={!hasSelectedNote || isTrashView}
                onClick={() =>
                  editor.chain().focus().clearNodes().unsetAllMarks().run()
                }
                data-tooltip="Clear formatting"
              >
                Clear formatting
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
    </section>
  );
}
