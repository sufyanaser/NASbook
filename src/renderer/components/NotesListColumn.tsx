import type { NoteListItem } from "../../shared/ipc";

interface NotesListColumnProps {
  readonly activeCategoryName: string;
  readonly canCreate: boolean;
  readonly isTrashView: boolean;
  readonly notes: readonly NoteListItem[];
  readonly selectedNoteId: number | null;
  readonly onCreateNote: () => void;
  readonly onSelectNote: (id: number) => void;
}

function formatShortDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotesListColumn({
  activeCategoryName,
  canCreate,
  isTrashView,
  notes,
  selectedNoteId,
  onCreateNote,
  onSelectNote,
}: NotesListColumnProps): JSX.Element {
  return (
    <section className="notes-list-column" aria-label="Notes list" dir="rtl">
      <header className="notes-list-header">
        <input
          aria-label="Search notes"
          className="notes-search"
          disabled
          placeholder="Search notes..."
          type="search"
        />
        <button
          className="new-note-button"
          disabled={!canCreate}
          onClick={onCreateNote}
          title={canCreate ? "New note" : "Cannot create notes in Trash"}
          type="button"
        >
          +
        </button>
      </header>

      <div className="category-context">
        <span>الفئة الحالية</span>
        <strong>{activeCategoryName}</strong>
      </div>

      <div className="notes-stack">
        {notes.length === 0 ? (
          <div className="notes-empty-state">
            {isTrashView ? (
              <strong>سلة المهملات فارغة.</strong>
            ) : (
              <>
                <strong>لا توجد ملاحظات هنا بعد.</strong>
                <span>اضغط + لإنشاء ملاحظة جديدة.</span>
              </>
            )}
          </div>
        ) : null}

        {notes.map((note) => (
          <button
            className="note-list-card"
            data-selected={note.id === selectedNoteId}
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            type="button"
          >
            <div className="note-card-topline">
              <h2>{note.title}</h2>
              <time>{formatShortDate(note.updatedAt)}</time>
            </div>
            <p>{note.preview || "لا يوجد محتوى بعد."}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
