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
        <span className="save-status-pill">Save: {saveStatus}</span>
      </div>

      {hasSelectedNote ? (
        <textarea
          className="note-content-textarea"
          dir="auto"
          disabled={isTrashView}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder="اكتب الملاحظة هنا..."
          value={draftContent}
        />
      ) : (
        <div className="editor-placeholder" dir="rtl">
          <p>اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة للبدء.</p>
        </div>
      )}
    </section>
  );
}
