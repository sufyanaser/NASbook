import type { NoteListItem } from "../../shared/ipc";
import { stripHtmlForPreview } from "../../shared/dirtyState";
import type { AppLanguage } from "../../shared/settings";
import { t } from "../../shared/i18n";

interface NotesListColumnProps {
  readonly activeCategoryName: string;
  readonly canCreate: boolean;
  readonly isTrashView: boolean;
  readonly notes: readonly NoteListItem[];
  readonly selectedNoteId: number | null;
  readonly showNoteDates: boolean;
  readonly showNotePreview: boolean;
  readonly language: AppLanguage;
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
  showNoteDates,
  showNotePreview,
  language,
  onCreateNote,
  onSelectNote,
}: NotesListColumnProps): JSX.Element {
  const createTooltip = canCreate ? t("newNote", language) : t("cannotCreateInTrash", language);

  return (
    <section
      className="notes-list-column"
      data-trash-view={isTrashView ? "true" : "false"}
      aria-label="Notes list"
    >
      <header className="notes-list-header">
        <span className="notes-list-title">{t("notesListTitle", language)}</span>
        <button
          aria-label={createTooltip}
          className="new-note-button"
          data-tooltip={createTooltip}
          disabled={!canCreate}
          onClick={onCreateNote}
          type="button"
        >
          +
        </button>
      </header>

      <div className="category-context">
        <span>{t("currentCategory", language)}</span>
        <strong>{activeCategoryName}</strong>
      </div>

      <div className="notes-stack">
        {notes.length === 0 ? (
          <div className="notes-empty-state">
            {isTrashView ? (
              <strong>{t("trashIsEmpty", language)}</strong>
            ) : (
              <>
                <strong>{t("noNotesYet", language)}</strong>
                <span>{t("pressPlusToCreate", language)}</span>
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
              {showNoteDates && (
                <time
                  title={`${t("createdAt", language)} ${formatShortDate(
                    note.createdAt,
                  )} • ${t("updatedAtShort", language)} ${formatShortDate(note.updatedAt)}`}
                >
                  {formatShortDate(note.updatedAt)}
                </time>
              )}
            </div>
            {showNotePreview && (
              <p>{stripHtmlForPreview(note.preview) || t("noContentYet", language)}</p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
