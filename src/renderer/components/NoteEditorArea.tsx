import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { NoteRecord } from "../../shared/ipc";

interface NoteEditorAreaProps {
  readonly activeCategoryName: string;
  readonly draftContent: string;
  readonly draftTitle: string;
  readonly isTrashView: boolean;
  readonly saveStatus: string;
  readonly selectedNote: NoteRecord | null;
  readonly onContentChange: (content: string) => void;
  readonly onDeletePermanent: () => void;
  readonly onDeleteToTrash: () => void;
  readonly onRestore: () => void;
  readonly onSave: () => void;
  readonly onTitleChange: (title: string) => void;
}

export function NoteEditorArea({
  activeCategoryName,
  draftContent,
  draftTitle,
  isTrashView,
  saveStatus,
  selectedNote,
  onContentChange,
  onDeletePermanent,
  onDeleteToTrash,
  onRestore,
  onSave,
  onTitleChange,
}: NoteEditorAreaProps): JSX.Element {
  const hasSelectedNote = selectedNote !== null;
  const isSettingContentRef = useRef(false);

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
      const isEmpty = editor.getText().trim() === "";
      const content = isEmpty ? "" : editor.getHTML();
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
        // Use contentHtml if present and non-empty; fallback to contentMarkdown
        const targetContent =
          selectedNote.contentHtml && selectedNote.contentHtml.trim() !== ""
            ? selectedNote.contentHtml
            : selectedNote.contentMarkdown || "";
        
        if (editor.getHTML() !== targetContent) {
          isSettingContentRef.current = true;
          editor.commands.setContent(targetContent);
          isSettingContentRef.current = false;
        }
      } else {
        isSettingContentRef.current = true;
        editor.commands.setContent("");
        isSettingContentRef.current = false;
      }
    }
  }, [selectedNote?.id, editor]);

  const isEditorEmpty = editor ? editor.getText().trim() === "" : true;

  return (
    <section className="editor-area" aria-label="Editor placeholder" dir="rtl">
      <header className="editor-header">
        <div>
          <span className="editor-eyebrow">{activeCategoryName}</span>
          <input
            className="note-title-input"
            disabled={!hasSelectedNote || isTrashView}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="عنوان الملاحظة..."
            type="text"
            value={draftTitle}
          />
        </div>
        <div className="direction-chip" title="RTL-first scaffold">
          RTL
        </div>
      </header>

      <div className="editor-toolbar" aria-label="Editor toolbar placeholder">
        {!isTrashView ? (
          <>
            <button disabled={!hasSelectedNote} onClick={onSave} type="button">
              Save
            </button>
            <button
              disabled={!hasSelectedNote}
              onClick={onDeleteToTrash}
              type="button"
            >
              Delete to Trash
            </button>
          </>
        ) : (
          <>
            <button disabled={!hasSelectedNote} onClick={onRestore} type="button">
              Restore
            </button>
            <button
              className="danger-button"
              disabled={!hasSelectedNote}
              onClick={onDeletePermanent}
              type="button"
            >
              Delete Permanently
            </button>
          </>
        )}
        {editor && (
          <>
            <div className="toolbar-divider" />
            <button
              type="button"
              disabled={!hasSelectedNote || isTrashView}
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive("bold") ? "true" : "false"}
              title="Bold — Ctrl+B"
            >
              Bold
            </button>
            <button
              type="button"
              disabled={!hasSelectedNote || isTrashView}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive("italic") ? "true" : "false"}
              title="Italic — Ctrl+I"
            >
              Italic
            </button>
            <button
              type="button"
              disabled={!hasSelectedNote || isTrashView}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive("bulletList") ? "true" : "false"}
              title="Bullet list"
            >
              Bullet list
            </button>
            <button
              type="button"
              disabled={!hasSelectedNote || isTrashView}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              data-active={editor.isActive("orderedList") ? "true" : "false"}
              title="Ordered list"
            >
              Ordered list
            </button>
            <button
              type="button"
              disabled={!hasSelectedNote || isTrashView}
              onClick={() =>
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              }
              title="Clear formatting"
            >
              Clear formatting
            </button>
          </>
        )}
        <span className="save-status-pill">Save: {saveStatus}</span>
      </div>

      {hasSelectedNote ? (
        <div
          className={`note-editor-content-wrapper${
            isEditorEmpty ? " is-editor-empty" : ""
          }`}
          dir="auto"
        >
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="editor-placeholder" dir="rtl">
          <p>اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة للبدء.</p>
        </div>
      )}
    </section>
  );
}

