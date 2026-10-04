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

function formatRelativeTime(value: string, language: AppLanguage): string {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));

  if (language === "ar") {
    if (diffSec < 45) return "الآن";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin <= 1) return "قبل دقيقة";
    if (diffMin === 2) return "قبل دقيقتين";
    if (diffMin >= 3 && diffMin <= 10) return `قبل ${diffMin} دقائق`;
    if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return "قبل ساعة";
    if (diffHours === 2) return "قبل ساعتين";
    if (diffHours >= 3 && diffHours <= 10) return `قبل ${diffHours} ساعات`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "قبل يوم";
    if (diffDays === 2) return "قبل يومين";
    if (diffDays >= 3 && diffDays <= 10) return `قبل ${diffDays} أيام`;
    return `قبل ${diffDays} يوماً`;
  }

  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin <= 1) return "1m ago";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
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
  const fallbackPlaceholder = language === "ar" ? "ملاحظة بدون عنوان" : "Untitled note";
  const placeholderText = t("noteTitlePlaceholder", language) || fallbackPlaceholder;

  return (
    <header className="editor-header">
      <div style={{ flex: 1 }}>
        <span className="editor-eyebrow">{activeCategoryName}</span>
        <input
          className="note-title-input"
          disabled={!selectedNote || isTrashView || isLocked}
          dir={editorDirection}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={placeholderText}
          type="text"
          value={draftTitle}
        />
        {selectedNote && showMetadata ? (
          <div className="note-metadata-row">
            {selectedNote.createdAt ? (
              <span
                className="metadata-item"
                title={`${t("createdAt", language)} ${formatDateTime(selectedNote.createdAt)}`}
              >
                {t("createdAt", language)} {formatRelativeTime(selectedNote.createdAt, language)}
              </span>
            ) : null}
            {selectedNote.updatedAt ? (
              <span
                className="metadata-item"
                title={`${t("updatedAt", language)} ${formatDateTime(selectedNote.updatedAt)}`}
              >
                {t("updatedAt", language)} {formatRelativeTime(selectedNote.updatedAt, language)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
