import type { NoteRecord } from "../../shared/ipc";
import { t } from "../../shared/i18n";
import type { AppLanguage, EditorDirection } from "../../shared/settings";

interface EditorNoteHeaderProps {
  readonly activeCategoryName: string;
  readonly draftTitle: string;
  readonly editorDirection: EditorDirection;
  readonly isLocked: boolean;
  readonly isTrashView: boolean;
  readonly language: AppLanguage;
  readonly selectedNote: NoteRecord | null;
  readonly showMetadata: boolean;
  readonly onTitleChange: (title: string) => void;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function EditorNoteHeader({
  activeCategoryName,
  draftTitle,
  editorDirection,
  isLocked,
  isTrashView,
  language,
  selectedNote,
  showMetadata,
  onTitleChange,
}: EditorNoteHeaderProps): JSX.Element {
  return (
    <header className="editor-header">
      <div style={{ flex: 1 }}>
        <span className="editor-eyebrow">{activeCategoryName}</span>
        <input
          className="note-title-input"
          disabled={!selectedNote || isTrashView || isLocked}
          dir={editorDirection}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t("noteTitlePlaceholder", language)}
          type="text"
          value={draftTitle}
        />
        {selectedNote && showMetadata ? (
          <div className="note-metadata-row">
            {selectedNote.createdAt ? (
              <span className="metadata-item">
                {t("createdAt", language)} {formatDateTime(selectedNote.createdAt)}
              </span>
            ) : null}
            {selectedNote.updatedAt ? (
              <span className="metadata-item">
                {t("updatedAt", language)} {formatDateTime(selectedNote.updatedAt)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
