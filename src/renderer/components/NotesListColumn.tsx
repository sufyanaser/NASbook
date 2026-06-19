import { useEffect, useRef, useState } from "react";
import type { NoteListItem } from "../../shared/ipc";
import type { CategoryRecord } from "../../shared/categories";
import { stripHtmlForPreview } from "../../shared/dirtyState";
import type { AppLanguage } from "../../shared/settings";
import { t, getCategoryDisplayName } from "../../shared/i18n";

interface NotesListColumnProps {
  readonly activeCategoryName: string;
  readonly canCreate: boolean;
  readonly isTrashView: boolean;
  readonly notes: readonly NoteListItem[];
  readonly selectedNoteId: number | null;
  readonly showNoteDates: boolean;
  readonly showNotePreview: boolean;
  readonly language: AppLanguage;
  readonly categories: readonly CategoryRecord[];
  readonly canExportNote: boolean;
  readonly onCreateNote: () => void;
  readonly onSelectNote: (id: number) => void;
  readonly onDeleteNote: (id: number) => void;
  readonly onRenameNote: (id: number, title: string) => void;
  readonly onMoveNote: (id: number, categoryId: number | null) => void;
  readonly onImportMarkdown: () => void;
  readonly onExportNote: () => void;
  readonly onExportCategory: () => void;
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

function RenameIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function MoveIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function DeleteIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ImportIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ExportIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 21h14" />
    </svg>
  );
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
  categories,
  canExportNote,
  onCreateNote,
  onSelectNote,
  onDeleteNote,
  onRenameNote,
  onMoveNote,
  onImportMarkdown,
  onExportNote,
  onExportCategory,
}: NotesListColumnProps): JSX.Element {
  const createTooltip = canCreate ? t("newNote", language) : t("cannotCreateInTrash", language);
  const isArabic = language === "ar";

  const [renamingNoteId, setRenamingNoteId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [movePopoverNoteId, setMovePopoverNoteId] = useState<number | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const moveMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Focus + select the rename field once, when rename mode opens for a note.
  // Keyed only on the note id so normal typing never re-selects the text.
  useEffect(() => {
    if (renamingNoteId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNoteId]);

  // Close the move popover on outside click or Escape.
  useEffect(() => {
    if (movePopoverNoteId === null) {
      return undefined;
    }
    const handleMouseDown = (event: MouseEvent): void => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMovePopoverNoteId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMovePopoverNoteId(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [movePopoverNoteId]);

  // Close the export menu on outside click or Escape.
  useEffect(() => {
    if (!isExportMenuOpen) {
      return undefined;
    }
    const handleMouseDown = (event: MouseEvent): void => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExportMenuOpen]);

  const moveTargets = categories.filter(
    (category) => category.slug !== "all-notes" && category.slug !== "trash",
  );

  const labelDelete = isArabic ? "حذف الملاحظة" : "Delete note";
  const labelRename = isArabic ? "إعادة تسمية الملاحظة" : "Rename note";
  const labelMove = isArabic ? "نقل الملاحظة" : "Move note";
  const labelMoveHeading = isArabic ? "نقل إلى" : "Move to";

  const startRename = (note: NoteListItem): void => {
    setMovePopoverNoteId(null);
    setRenameValue(note.title);
    setRenamingNoteId(note.id);
  };

  const commitRename = (note: NoteListItem): void => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== note.title) {
      onRenameNote(note.id, trimmed);
    }
    setRenamingNoteId(null);
  };

  return (
    <section
      className="notes-list-column"
      data-trash-view={isTrashView ? "true" : "false"}
      aria-label="Notes list"
    >
      <header className="notes-list-header">
        <span className="notes-list-title">{t("notesListTitle", language)}</span>
        <div className="notes-list-actions">
          <button
            aria-label={isArabic ? "استيراد Markdown" : "Import Markdown"}
            className="notes-header-button"
            data-tooltip={isArabic ? "استيراد Markdown" : "Import Markdown"}
            onClick={onImportMarkdown}
            type="button"
          >
            <ImportIcon />
          </button>
          <div className="note-export-control">
            <button
              aria-label={isArabic ? "تصدير Markdown" : "Export Markdown"}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              className="notes-header-button"
              data-tooltip={isArabic ? "تصدير Markdown" : "Export Markdown"}
              onClick={() => setIsExportMenuOpen((open) => !open)}
              type="button"
            >
              <ExportIcon />
            </button>
            {isExportMenuOpen && (
              <div
                ref={exportMenuRef}
                className="note-export-menu"
                role="menu"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <button
                  className="note-move-item"
                  role="menuitem"
                  disabled={!canExportNote}
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExportNote();
                  }}
                  type="button"
                >
                  {isArabic ? "تصدير الملاحظة الحالية" : "Export current note"}
                </button>
                <button
                  className="note-move-item"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExportCategory();
                  }}
                  type="button"
                >
                  {isArabic ? "تصدير التصنيف الحالي" : "Export current category"}
                </button>
              </div>
            )}
          </div>
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
        </div>
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

        {notes.map((note) => {
          const isRenaming = renamingNoteId === note.id;
          const isMoveOpen = movePopoverNoteId === note.id;

          return (
            <div
              className="note-list-card"
              data-selected={note.id === selectedNoteId}
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isRenaming) {
                  return;
                }
                onSelectNote(note.id);
              }}
              onKeyDown={(event) => {
                if (isRenaming) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectNote(note.id);
                }
              }}
            >
              <div className="note-card-topline">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    className="note-rename-input"
                    value={renameValue}
                    dir={isArabic ? "rtl" : "ltr"}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename(note);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        setRenamingNoteId(null);
                      }
                    }}
                    onBlur={() => commitRename(note)}
                    type="text"
                  />
                ) : (
                  <h2>{note.title}</h2>
                )}
                {showNoteDates && !isRenaming && (
                  <time
                    title={`${t("createdAt", language)} ${formatShortDate(
                      note.createdAt,
                    )} • ${t("updatedAtShort", language)} ${formatShortDate(note.updatedAt)}`}
                  >
                    {formatShortDate(note.updatedAt)}
                  </time>
                )}
              </div>
              {showNotePreview && !isRenaming && (
                <p>{stripHtmlForPreview(note.preview) || t("noContentYet", language)}</p>
              )}

              {!isTrashView && !isRenaming && (
                <div className="note-actions" role="group" aria-label={labelMove}>
                  <button
                    aria-label={labelRename}
                    className="note-action-button"
                    data-tooltip={labelRename}
                    onClick={(event) => {
                      event.stopPropagation();
                      startRename(note);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    type="button"
                  >
                    <RenameIcon />
                  </button>
                  <div className="note-move-control">
                    <button
                      aria-label={labelMove}
                      aria-haspopup="menu"
                      aria-expanded={isMoveOpen}
                      className="note-action-button"
                      data-tooltip={labelMove}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMovePopoverNoteId(isMoveOpen ? null : note.id);
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      <MoveIcon />
                    </button>
                    {isMoveOpen && (
                      <div
                        ref={moveMenuRef}
                        className="note-move-popover"
                        role="menu"
                        dir={isArabic ? "rtl" : "ltr"}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className="note-move-heading">{labelMoveHeading}</span>
                        {moveTargets.map((category) => {
                          const isCurrent = category.id === note.categoryId;
                          return (
                            <button
                              key={category.slug}
                              className="note-move-item"
                              role="menuitem"
                              disabled={isCurrent}
                              data-current={isCurrent ? "true" : "false"}
                              onClick={() => {
                                onMoveNote(note.id, category.id);
                                setMovePopoverNoteId(null);
                              }}
                              type="button"
                            >
                              {getCategoryDisplayName(category.slug, category.name, language)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    aria-label={labelDelete}
                    className="note-action-button note-action-delete"
                    data-tooltip={labelDelete}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    type="button"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
