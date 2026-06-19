import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultCategories,
  type CategoryRecord,
  type CategorySlug,
} from "../shared/categories";
import { hasUnsavedNoteChanges } from "../shared/dirtyState";
import type { AppInfo, NoteRecord, NoteListItem } from "../shared/ipc";
import {
  defaultAppSettings,
  getToggledLightDarkTheme,
  type AppSettings,
} from "../shared/settings";
import { NavigationRail } from "./components/NavigationRail";
import { NoteEditorArea } from "./components/NoteEditorArea";
import { NotesListColumn } from "./components/NotesListColumn";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusFooter } from "./components/StatusFooter";
import {
  AppContextMenu,
  type ContextMenuState,
} from "./components/AppContextMenu";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { t, getCategoryDisplayName } from "../shared/i18n";
import {
  extractMarkdownTitle,
  htmlToMarkdown,
  markdownToHtml,
  toSafeFilename,
} from "./markdown";

type DatabaseStatus = "ready" | "unavailable";
type SaveStatus = "Idle" | "Unsaved" | "Saving" | "Saved" | "Error";

const AUTOSAVE_DELAY_MS = 800;

function createFallbackCategories(): readonly CategoryRecord[] {
  return defaultCategories.map((category, index) => ({
    ...category,
    id: index + 1,
    icon: "",
    isSystem: true,
  }));
}

function isEditableCategory(slug: CategorySlug): boolean {
  return slug !== "trash";
}

export function App(): JSX.Element {
  const [categories, setCategories] =
    useState<readonly CategoryRecord[]>(createFallbackCategories);
  const [activeCategory, setActiveCategory] =
    useState<CategorySlug>("all-notes");
  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus>("unavailable");
  const [notes, setNotes] = useState<readonly NoteListItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteRecord | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("Idle");
  const [notesCount, setNotesCount] = useState(0);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [settings, setSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] =
    useState(false);
  const contextFocusRef = useRef<HTMLElement | null>(null);

  const [pendingNavigationAction, setPendingNavigationAction] = useState<
    (() => void) | null
  >(null);
  const [isSaveFailedDialogOpen, setIsSaveFailedDialogOpen] = useState(false);

  const autosaveTimerRef = useRef<number | null>(null);
  const saveInProgressRef = useRef(false);
  const pendingResaveRef = useRef(false);
  const selectedNoteRef = useRef<NoteRecord | null>(null);
  const draftRef = useRef<{ title: string; content: string }>({
    title: "",
    content: "",
  });
  const activeCategoryRef = useRef<CategorySlug>("all-notes");
  const refreshNotesRef = useRef<() => Promise<void>>(async () => {});
  const confirmUnsavedSwitchRef = useRef(true);

  const [notesListWidth, setNotesListWidth] = useState<number>(() => {
    const saved = localStorage.getItem("nas-notesbook.layout.notesListWidth");
    const parsed = saved !== null ? parseInt(saved, 10) : Number.NaN;
    if (Number.isNaN(parsed)) {
      return 320;
    }
    return Math.min(480, Math.max(240, parsed));
  });

  const [navRailExpanded, setNavRailExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem("nas-notesbook.layout.navRailExpanded");
    return saved === "true";
  });

  const handleToggleNavRail = useCallback(() => {
    setNavRailExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("nas-notesbook.layout.navRailExpanded", String(next));
      return next;
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = notesListWidth;

    document.body.classList.add("is-resizing-notes-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth + deltaX;
      if (newWidth < 240) newWidth = 240;
      if (newWidth > 480) newWidth = 480;
      setNotesListWidth(newWidth);
      localStorage.setItem("nas-notesbook.layout.notesListWidth", String(newWidth));
    };

    const handlePointerUp = () => {
      document.body.classList.remove("is-resizing-notes-pane");
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -16 : 16;
      let newWidth = notesListWidth + delta;
      if (newWidth < 240) newWidth = 240;
      if (newWidth > 480) newWidth = 480;
      setNotesListWidth(newWidth);
      localStorage.setItem("nas-notesbook.layout.notesListWidth", String(newWidth));
    }
  };

  const activeCategoryRecord = useMemo(() => {
    return categories.find((category) => category.slug === activeCategory);
  }, [activeCategory, categories]);

  const activeCategoryName = activeCategoryRecord
    ? getCategoryDisplayName(activeCategoryRecord.slug, activeCategoryRecord.name, settings.language)
    : t("allNotes", settings.language);
  const hasUnsavedChanges = hasUnsavedNoteChanges(
    selectedNote,
    draftTitle,
    draftContent,
  );

  selectedNoteRef.current = selectedNote;
  draftRef.current = { title: draftTitle, content: draftContent };
  activeCategoryRef.current = activeCategory;
  confirmUnsavedSwitchRef.current = settings.confirmUnsavedSwitch;

  const loadNotes = async (
    api: NonNullable<typeof window.nasNotesbook>,
    category: CategorySlug,
    categoryId: number | null,
  ): Promise<readonly NoteListItem[]> => {
    if (category === "trash") {
      return api.notes.list({ includeTrash: true });
    }

    if (category === "all-notes") {
      return api.notes.list();
    }

    return api.notes.list({ categoryId });
  };

  const refreshNotes = async (): Promise<void> => {
    const api = window.nasNotesbook;

    if (!api) {
      setDatabaseStatus("unavailable");
      return;
    }

    const categoryId = activeCategoryRecord?.id ?? null;
    const nextNotes = await loadNotes(api, activeCategory, categoryId);
    setNotes(nextNotes);
    setNotesCount(nextNotes.length);
  };

  refreshNotesRef.current = refreshNotes;

  // Core save used by both autosave and manual save. Reads the latest draft /
  // selected note from refs so debounced timers never act on stale closures.
  // Returns true when the note is persisted (or there was nothing to save).
  const performSave = useCallback(async (): Promise<boolean> => {
    const api = window.nasNotesbook;
    const note = selectedNoteRef.current;

    // Nothing to save, or note not editable (e.g. trash) -> treat as success.
    if (!api || !note || activeCategoryRef.current === "trash") {
      return true;
    }

    const { title, content } = draftRef.current;

    // Skip if the draft already matches the last saved snapshot (selectedNote).
    if (!hasUnsavedNoteChanges(note, title, content)) {
      return true;
    }

    // A save is already running: queue exactly one follow-up and bail.
    if (saveInProgressRef.current) {
      pendingResaveRef.current = true;
      return true;
    }

    saveInProgressRef.current = true;
    const savingId = note.id;
    setSaveStatus("Saving");

    try {
      const updated = await api.notes.update({
        id: savingId,
        title,
        contentMarkdown: content,
        categoryId: note.categoryId,
        isRtl: note.isRtl,
      });

      // Only reflect the result if the user is still on the same note.
      if (selectedNoteRef.current?.id === savingId) {
        setSelectedNote(updated);
        // The backend normalizes some fields (e.g. an empty title becomes
        // "Untitled Note"). Sync the draft to the persisted values so the note
        // is not seen as perpetually dirty (which would loop autosave) — but
        // only when the user has not typed more since this save was scheduled,
        // to avoid clobbering input or moving the caret.
        if (
          draftRef.current.title === title &&
          draftRef.current.content === content
        ) {
          setDraftTitle(updated.title);
          setDraftContent(updated.contentMarkdown);
        }
        setSaveStatus("Saved");
      }
      await refreshNotesRef.current();

      saveInProgressRef.current = false;
      if (pendingResaveRef.current) {
        pendingResaveRef.current = false;
        return performSave();
      }
      return true;
    } catch {
      saveInProgressRef.current = false;
      pendingResaveRef.current = false;
      if (selectedNoteRef.current?.id === savingId) {
        setSaveStatus("Error");
      }
      return false;
    }
  }, []);

  // Cancel any pending debounce and persist immediately.
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    return performSave();
  }, [performSave]);

  // Gate note/category/new-note navigation behind autosave. If there is nothing
  // pending, navigate immediately. Otherwise flush; only surface the in-app
  // dialog when the save actually fails.
  const requestNavigation = useCallback(
    (action: () => void): void => {
      const dirty = hasUnsavedNoteChanges(
        selectedNoteRef.current,
        draftRef.current.title,
        draftRef.current.content,
      );
      const pending =
        dirty ||
        autosaveTimerRef.current !== null ||
        saveInProgressRef.current;

      if (!pending) {
        action();
        return;
      }

      void flushSave().then((ok) => {
        if (ok) {
          action();
        } else if (confirmUnsavedSwitchRef.current) {
          setPendingNavigationAction(() => action);
          setIsSaveFailedDialogOpen(true);
        } else {
          action();
        }
      });
    },
    [flushSave],
  );

  const clearSelectedNote = (): void => {
    setSelectedNote(null);
    setDraftTitle("");
    setDraftContent("");
    setSaveStatus("Idle");
  };

  useEffect(() => {
    let isMounted = true;
    const api = window.nasNotesbook;

    if (!api) {
      setDatabaseStatus("unavailable");
      return () => {
        isMounted = false;
      };
    }

    Promise.all([
      api.app.getInfo(),
      api.settings.get(),
      api.categories.list(),
      loadNotes(api, activeCategory, null),
    ])
      .then(([nextAppInfo, nextSettings, nextCategories, nextNotes]) => {
        if (!isMounted) {
          return;
        }

        setDatabaseStatus("ready");
        setAppInfo(nextAppInfo);
        setSettings(nextSettings);
        setCategories(
          nextCategories.length > 0
            ? nextCategories
            : createFallbackCategories(),
        );
        setNotes(nextNotes);
        setNotesCount(nextNotes.length);
      })
      .catch(() => {
        if (isMounted) {
          setDatabaseStatus("unavailable");
          setCategories(createFallbackCategories());
          setNotesCount(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === "ar" ? "rtl" : "ltr";
  }, [settings.language]);

  useEffect(() => {
    void refreshNotes().catch(() => {
      setDatabaseStatus("unavailable");
      setNotes([]);
      setNotesCount(0);
    });
    clearSelectedNote();
  }, [activeCategory, activeCategoryRecord?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (selectedNote && activeCategory !== "trash") {
          void handleSaveNote();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNote, activeCategory, draftTitle, draftContent]);

  // Debounced autosave: persist AUTOSAVE_DELAY_MS after the user stops typing.
  // Every draft change resets the timer; the timer is skipped entirely when
  // there is no selected note, the note is trashed, or nothing is dirty.
  useEffect(() => {
    if (!selectedNote || activeCategory === "trash" || !hasUnsavedChanges) {
      return undefined;
    }

    setSaveStatus("Unsaved");
    const handle = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void performSave();
    }, AUTOSAVE_DELAY_MS);
    autosaveTimerRef.current = handle;

    return () => {
      window.clearTimeout(handle);
      if (autosaveTimerRef.current === handle) {
        autosaveTimerRef.current = null;
      }
    };
  }, [
    draftTitle,
    draftContent,
    selectedNote,
    activeCategory,
    hasUnsavedChanges,
    performSave,
  ]);

  // Best-effort flush when the window is closing.
  useEffect(() => {
    const handler = (): void => {
      const dirty = hasUnsavedNoteChanges(
        selectedNoteRef.current,
        draftRef.current.title,
        draftRef.current.content,
      );
      if (dirty || autosaveTimerRef.current !== null) {
        void flushSave();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [flushSave]);

  const doSelectNote = async (id: number): Promise<void> => {
    const note = await window.nasNotesbook?.notes.getById(id);

    if (!note) {
      return;
    }

    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    setSaveStatus("Idle");
  };

  const handleSelectNote = (id: number): void => {
    if (id === selectedNote?.id) {
      return;
    }
    requestNavigation(() => {
      void doSelectNote(id);
    });
  };

  const doCreateNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api || !isEditableCategory(activeCategory)) {
      return;
    }

    const categoryId =
      activeCategory === "all-notes" ? null : activeCategoryRecord?.id ?? null;
    const note = await api.notes.create({ categoryId, isRtl: true });
    await refreshNotes();
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    setSaveStatus("Saved");
  };

  const handleCreateNote = (): void => {
    if (!window.nasNotesbook || !isEditableCategory(activeCategory)) {
      return;
    }
    requestNavigation(() => {
      void doCreateNote();
    });
  };

  const handleSelectCategory = (category: CategorySlug): void => {
    if (category === activeCategory) {
      return;
    }
    requestNavigation(() => setActiveCategory(category));
  };

  // Manual save / Ctrl+S: flush any pending autosave and persist immediately.
  const handleSaveNote = async (): Promise<void> => {
    await flushSave();
  };

  // Cancel a queued autosave for a note before a list action mutates it, so a
  // stale debounced write cannot race the delete/rename/move.
  const cancelAutosaveFor = (id: number): void => {
    if (selectedNoteRef.current?.id === id && autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const handleDeleteNoteById = async (id: number): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    cancelAutosaveFor(id);
    await api.notes.deleteToTrash(id);

    const categoryId = activeCategoryRecord?.id ?? null;
    const nextNotes = await loadNotes(api, activeCategory, categoryId);
    setNotes(nextNotes);
    setNotesCount(nextNotes.length);

    // If the deleted note was open, fall through to the next available note.
    if (selectedNoteRef.current?.id === id) {
      const next = nextNotes[0] ?? null;
      if (next) {
        void doSelectNote(next.id);
      } else {
        clearSelectedNote();
      }
    }
  };

  const handleRenameNote = async (id: number, title: string): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    const isSelected = selectedNoteRef.current?.id === id;
    cancelAutosaveFor(id);

    // For the open note, preserve any unsaved draft content; otherwise read the
    // persisted note so we never overwrite it with stale content.
    const base = isSelected ? selectedNoteRef.current : await api.notes.getById(id);
    if (!base) {
      return;
    }

    const content = isSelected ? draftRef.current.content : base.contentMarkdown;
    const updated = await api.notes.update({
      id,
      title,
      contentMarkdown: content,
      categoryId: base.categoryId,
      isRtl: base.isRtl,
    });
    await refreshNotes();

    if (selectedNoteRef.current?.id === id) {
      setSelectedNote(updated);
      setDraftTitle(updated.title);
      setDraftContent(updated.contentMarkdown);
      setSaveStatus("Saved");
    }
  };

  const handleMoveNote = async (
    id: number,
    categoryId: number | null,
  ): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    const isSelected = selectedNoteRef.current?.id === id;
    cancelAutosaveFor(id);

    const base = isSelected ? selectedNoteRef.current : await api.notes.getById(id);
    if (!base) {
      return;
    }

    const title = isSelected ? draftRef.current.title : base.title;
    const content = isSelected ? draftRef.current.content : base.contentMarkdown;
    const updated = await api.notes.update({
      id,
      title,
      contentMarkdown: content,
      categoryId,
      isRtl: base.isRtl,
    });
    await refreshNotes();

    if (selectedNoteRef.current?.id === id) {
      setSelectedNote(updated);
      setDraftTitle(updated.title);
      setDraftContent(updated.contentMarkdown);
      setSaveStatus("Saved");
    }
  };

  // Import a single .md file as a new note in the current category. Conversion
  // and sanitization happen here in the renderer; main only reads the file.
  const handleImportMarkdown = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    // Persist any pending edits on the open note before changing selection.
    await flushSave();

    const result = await api.markdown.importFile();
    if (!result.ok) {
      if (result.error) {
        setSaveStatus("Error");
      }
      return;
    }

    const markdown = result.markdown ?? "";
    const html = markdownToHtml(markdown);
    const title = extractMarkdownTitle(markdown, result.filename ?? "");
    const categoryId = isEditableCategory(activeCategory)
      ? activeCategory === "all-notes"
        ? null
        : activeCategoryRecord?.id ?? null
      : null;

    const note = await api.notes.create({
      title,
      contentMarkdown: html,
      categoryId,
      isRtl: true,
    });
    await refreshNotes();
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    setSaveStatus("Saved");
  };

  const handleExportNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api || !selectedNoteRef.current) {
      return;
    }

    await flushSave();
    const html =
      draftRef.current.content || selectedNoteRef.current.contentMarkdown || "";
    const title =
      draftRef.current.title || selectedNoteRef.current.title || "note";
    const markdown = htmlToMarkdown(html);

    const res = await api.markdown.exportFile({
      defaultFilename: `${toSafeFilename(title)}.md`,
      markdown,
    });
    if (res.ok) {
      setSaveStatus("Saved");
    } else if (res.error) {
      setSaveStatus("Error");
    }
  };

  // Combine every note in the active category into a single .md file, each note
  // introduced by its "# Title" and separated by a thematic break.
  const handleExportCategory = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    await flushSave();
    const categoryId = activeCategoryRecord?.id ?? null;
    const list = await loadNotes(api, activeCategory, categoryId);
    if (list.length === 0) {
      return;
    }

    const sections: string[] = [];
    for (const item of list) {
      const full = await api.notes.getById(item.id);
      if (!full) {
        continue;
      }
      const body = htmlToMarkdown(full.contentMarkdown || "").trim();
      sections.push(`# ${full.title}\n\n${body}`.trim());
    }

    const combined = `${sections.join("\n\n---\n\n")}\n`;
    const res = await api.markdown.exportFile({
      defaultFilename: `${toSafeFilename(activeCategoryName)}.md`,
      markdown: combined,
    });
    if (res.ok) {
      setSaveStatus("Saved");
    } else if (res.error) {
      setSaveStatus("Error");
    }
  };

  const handleUpdateSettings = (updates: Partial<AppSettings>): void => {
    const nextSettings = {
      ...settings,
      ...updates,
    };
    setSettings(nextSettings);

    void window.nasNotesbook?.settings
      .update(updates)
      .then(setSettings)
      .catch(() => {
        setSettings(settings);
      });
  };

  const handleOpenDataFolder = (): void => {
    void window.nasNotesbook?.app.openDataFolder();
  };

  const handleToggleLightDarkTheme = (): void => {
    handleUpdateSettings({ theme: getToggledLightDarkTheme(settings.theme) });
  };

  const handleDeleteToTrash = async (): Promise<void> => {
    if (!selectedNote || !window.nasNotesbook) {
      return;
    }

    await window.nasNotesbook.notes.deleteToTrash(selectedNote.id);
    await refreshNotes();
    clearSelectedNote();
  };

  const handleRestore = async (): Promise<void> => {
    if (!selectedNote || !window.nasNotesbook) {
      return;
    }

    await window.nasNotesbook.notes.restore(selectedNote.id);
    await refreshNotes();
    clearSelectedNote();
  };

  const performDeletePermanent = async (): Promise<void> => {
    if (!selectedNote || !window.nasNotesbook) {
      return;
    }

    await window.nasNotesbook.notes.deletePermanent(selectedNote.id);
    await refreshNotes();
    clearSelectedNote();
  };

  const handleDeletePermanent = (): void => {
    if (!selectedNote || !window.nasNotesbook) {
      return;
    }

    setIsPermanentDeleteDialogOpen(true);
  };

  const handleDraftTitleChange = (title: string): void => {
    setDraftTitle(title);
    setSaveStatus("Unsaved");
  };

  const handleDraftContentChange = (content: string): void => {
    setDraftContent(content);
    setSaveStatus("Unsaved");
  };

  const handleOpenContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>): void => {
      event.preventDefault();
      contextFocusRef.current = document.activeElement as HTMLElement | null;

      const selectionText = window.getSelection()?.toString() ?? "";
      const activeElement = document.activeElement;
      const isEditableTarget =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLElement && activeElement.isContentEditable;

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        canCopy: selectionText.length > 0,
        canPaste: isEditableTarget,
        canSelectAll: Boolean(activeElement),
      });
    },
    [],
  );

  const handleContextMenuAction = (action: "copy" | "paste" | "selectAll"): void => {
    const focusedElement = contextFocusRef.current;
    focusedElement?.focus();
    setContextMenu(null);

    if (action === "copy") {
      document.execCommand("copy");
      return;
    }

    if (action === "selectAll") {
      document.execCommand("selectAll");
      return;
    }

    const pasted = document.execCommand("paste");
    if (!pasted && navigator.clipboard) {
      void navigator.clipboard.readText().then((text) => {
        focusedElement?.focus();
        document.execCommand("insertText", false, text);
      });
    }
  };

  return (
    <main
      className="app-shell"
      aria-label="NAS Notesbook workspace"
      onContextMenu={handleOpenContextMenu}
      style={{
        "--nav-rail-width": `${navRailExpanded ? 196 : 60}px`,
        "--notes-list-width": `${notesListWidth}px`,
      } as React.CSSProperties}
    >
      <NavigationRail
        activeCategory={activeCategory}
        categories={categories}
        railIconMode={settings.railIconMode}
        language={settings.language}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectCategory={handleSelectCategory}
        expanded={navRailExpanded}
        onToggleExpanded={handleToggleNavRail}
      />
      <NotesListColumn
        activeCategoryName={activeCategoryName}
        canCreate={isEditableCategory(activeCategory)}
        isTrashView={activeCategory === "trash"}
        notes={notes}
        selectedNoteId={selectedNote?.id ?? null}
        showNoteDates={settings.showNoteDates}
        showNotePreview={settings.showNotePreview}
        language={settings.language}
        categories={categories}
        canExportNote={selectedNote !== null}
        onImportMarkdown={() => {
          void handleImportMarkdown();
        }}
        onExportNote={() => {
          void handleExportNote();
        }}
        onExportCategory={() => {
          void handleExportCategory();
        }}
        onCreateNote={() => {
          void handleCreateNote();
        }}
        onSelectNote={(id) => {
          void handleSelectNote(id);
        }}
        onDeleteNote={(id) => {
          void handleDeleteNoteById(id);
        }}
        onRenameNote={(id, title) => {
          void handleRenameNote(id, title);
        }}
        onMoveNote={(id, categoryId) => {
          void handleMoveNote(id, categoryId);
        }}
      />
      <div
        className="notes-split-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize notes list"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      />
      <NoteEditorArea
        activeCategoryName={activeCategoryName}
        draftContent={draftContent}
        draftTitle={draftTitle}
        editorDensity={settings.editorDensity}
        editorDirection={settings.editorDirection}
        fontSize={settings.fontSize}
        isTrashView={activeCategory === "trash"}
        saveStatus={saveStatus}
        selectedNote={selectedNote}
        showMetadata={settings.showMetadata}
        theme={settings.theme}
        language={settings.language}
        onContentChange={handleDraftContentChange}
        onDeletePermanent={() => {
          handleDeletePermanent();
        }}
        onDeleteToTrash={() => {
          void handleDeleteToTrash();
        }}
        onRestore={() => {
          void handleRestore();
        }}
        onSave={() => {
          void handleSaveNote();
        }}
        onToggleTheme={handleToggleLightDarkTheme}
        onTitleChange={handleDraftTitleChange}
      />
      <AppContextMenu
        menu={contextMenu}
        language={settings.language}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenu(null)}
      />
      <ConfirmDialog
        confirmLabel={t("dialogPermanentDeleteConfirm", settings.language)}
        cancelLabel={t("dialogPermanentDeleteCancel", settings.language)}
        isOpen={isPermanentDeleteDialogOpen}
        message={t("dialogPermanentDeleteMessage", settings.language)}
        title={t("dialogPermanentDeleteTitle", settings.language)}
        variant="destructive"
        onCancel={() => setIsPermanentDeleteDialogOpen(false)}
        onConfirm={() => {
          setIsPermanentDeleteDialogOpen(false);
          void performDeletePermanent();
        }}
      />
      <ConfirmDialog
        confirmLabel={t("saveFailedDialogConfirm", settings.language)}
        cancelLabel={t("saveFailedDialogCancel", settings.language)}
        isOpen={isSaveFailedDialogOpen}
        message={t("saveFailedDialogBody", settings.language)}
        title={t("saveFailedDialogTitle", settings.language)}
        variant="destructive"
        onCancel={() => {
          setIsSaveFailedDialogOpen(false);
          setPendingNavigationAction(null);
        }}
        onConfirm={() => {
          setIsSaveFailedDialogOpen(false);
          const action = pendingNavigationAction;
          setPendingNavigationAction(null);
          action?.();
        }}
      />
      <SettingsPanel
        appInfo={appInfo}
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onOpenDataFolder={handleOpenDataFolder}
        onUpdateSettings={handleUpdateSettings}
      />
      <StatusFooter
        activeCategoryName={activeCategoryName}
        categoriesCount={categories.length}
        databaseStatus={databaseStatus}
        notesCount={notesCount}
        saveStatus={saveStatus}
        language={settings.language}
      />
    </main>
  );
}
