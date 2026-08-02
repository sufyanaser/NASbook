import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultCategories,
  type CategoryRecord,
  type CategorySlug,
} from "../shared/categories";
import { hasUnsavedNoteChanges } from "../shared/dirtyState";
import { createLatestSaveQueue } from "../shared/saveQueue";
import type {
  AppInfo,
  NoteRecord,
  NoteListItem,
  NasbkImportResult,
  UpdateCategoryInput,
} from "../shared/ipc";
import {
  defaultAppSettings,
  getToggledLightDarkTheme,
  type AppSettings,
} from "../shared/settings";
import { NavigationRail } from "./components/NavigationRail";
import { NoteEditorArea } from "./components/NoteEditorArea";
import { NotesListColumn } from "./components/NotesListColumn";
import { StatusFooter } from "./components/StatusFooter";
import {
  AppContextMenu,
  type ContextMenuState,
} from "./components/AppContextMenu";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { TitleBar } from "./components/TitleBar";
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
const SettingsPanel = lazy(async () => {
  const module = await import("./components/SettingsPanel");
  return { default: module.SettingsPanel };
});

// Direction-neutral side-panel glyph, used to toggle the notes list.
function PanelToggleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

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

function getPlainTextFromHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  } catch {
    return "";
  }
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
  const [renamingNoteId, setRenamingNoteId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [movePopoverNoteId, setMovePopoverNoteId] = useState<number | null>(null);
  const contextFocusRef = useRef<HTMLElement | null>(null);

  const nasDebugLog = (message: string, ...args: unknown[]) => {
    if (localStorage.getItem("NAS_DEBUG_STORAGE") === "1") {
      console.log(message, ...args);
    }
  };


  const [pendingNavigationAction, setPendingNavigationAction] = useState<
    (() => void | Promise<void>) | null
  >(null);
  const [isSaveFailedDialogOpen, setIsSaveFailedDialogOpen] = useState(false);

  const autosaveTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef(createLatestSaveQueue());
  const pendingManualSaveRef = useRef(false);
  const closeRequestInProgressRef = useRef(false);
  const navigationRequestRef = useRef(0);
  const selectionRequestRef = useRef(0);
  const createInProgressRef = useRef(false);
  const selectedNoteRef = useRef<NoteRecord | null>(null);
  const draftRef = useRef<{ title: string; content: string }>({
    title: "",
    content: "",
  });
  const draftTextRef = useRef("");
  const activeCategoryRef = useRef<CategorySlug>("all-notes");
  const refreshNotesRef = useRef<() => Promise<readonly NoteListItem[]>>(async () => []);
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

  const [notesListCollapsed, setNotesListCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("nas-notesbook.layout.notesListCollapsed");
    return saved === "true";
  });

  const handleToggleNotesList = useCallback(() => {
    setNotesListCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("nas-notesbook.layout.notesListCollapsed", String(next));
      return next;
    });
  }, []);

  const isFocusMode = useMemo(() => {
    const saved = sessionStorage.getItem("nas-notesbook.focusMode");
    return saved === "true";
  }, []);


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

  const refreshNotes = async (): Promise<readonly NoteListItem[]> => {
    const api = window.nasNotesbook;

    if (!api) {
      setDatabaseStatus("unavailable");
      return [];
    }

    const categoryId = activeCategoryRecord?.id ?? null;
    const nextNotes = await loadNotes(api, activeCategory, categoryId);
    setNotes(nextNotes);
    setNotesCount(nextNotes.length);
    return nextNotes;
  };

  refreshNotesRef.current = refreshNotes;

  // Core save used by both autosave and manual save. The queue is a navigation
  // barrier: callers cannot switch notes until the active write and the latest
  // queued draft have both completed.
  const performSave = useCallback((isManualSave = false): Promise<boolean> => {
    if (isManualSave) {
      pendingManualSaveRef.current = true;
    }

    return saveQueueRef.current.request(async () => {
      const api = window.nasNotesbook;
      const note = selectedNoteRef.current;
      const shouldUpdateLinkedFile = pendingManualSaveRef.current;
      pendingManualSaveRef.current = false;

      nasDebugLog("[TRACE] App performSave START", {
        reason: shouldUpdateLinkedFile ? "manualSave" : "autosave",
        noteId: note?.id,
        selectedNoteId: selectedNoteRef.current?.id,
        hasApi: !!api,
        activeCategory: activeCategoryRef.current,
      });

      if (!api || !note || activeCategoryRef.current === "trash") {
        return true;
      }

      const { title, content } = draftRef.current;
      const contentText =
        draftTextRef.current || getPlainTextFromHtml(content);

      // Prevent a transient editor teardown from erasing persisted content.
      // An intentional clear remains valid while the editor has focus, and a
      // manual save always persists exactly what the operator requested.
      if (
        !shouldUpdateLinkedFile &&
        content === "" &&
        note.contentMarkdown !== "" &&
        !document.activeElement?.classList.contains("ProseMirror")
      ) {
        return true;
      }

      if (!hasUnsavedNoteChanges(note, title, content)) {
        if (shouldUpdateLinkedFile) {
          const linkedPath = localStorage.getItem(
            `nasbook.nasbk.link.${note.id}`,
          );
          if (linkedPath) {
            try {
              const result = await api.nasbk.saveFile({
                title: note.title,
                contentHtml: note.contentMarkdown,
                contentText,
                metadata: {
                  isRtl: note.isRtl,
                  createdAt: note.createdAt,
                  updatedAt: note.updatedAt,
                },
                formatVersion: 1,
                filePath: linkedPath,
              });
              if (result.ok) {
                return true;
              }
            } catch {
              // The normal error state below keeps navigation blocked.
            }
            if (selectedNoteRef.current?.id === note.id) {
              setSaveStatus("Error");
            }
            return false;
          }
        }
        return true;
      }

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

        if (selectedNoteRef.current?.id === savingId) {
          setSelectedNote(updated);
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

        if (shouldUpdateLinkedFile) {
          const linkedPath = localStorage.getItem(
            `nasbook.nasbk.link.${savingId}`,
          );
          if (linkedPath) {
            const result = await api.nasbk.saveFile({
              title: updated.title,
              contentHtml: updated.contentMarkdown,
              contentText,
              metadata: {
                isRtl: updated.isRtl,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
              },
              formatVersion: 1,
              filePath: linkedPath,
            });
            if (!result.ok) {
              if (selectedNoteRef.current?.id === savingId) {
                setSaveStatus("Error");
              }
              return false;
            }
          }
        }

        return true;
      } catch {
        if (selectedNoteRef.current?.id === savingId) {
          setSaveStatus("Error");
        }
        return false;
      }
    });
  }, []);

  // Cancel any pending debounce and persist immediately.
  const flushSave = useCallback(async (isManualSave = false): Promise<boolean> => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    return performSave(isManualSave);
  }, [performSave]);

  // Closing must wait for the async SQLite IPC write. A beforeunload callback
  // cannot provide that guarantee because Electron destroys the renderer
  // without awaiting its Promise.
  const flushSaveBeforeClose = useCallback(async (): Promise<boolean> => {
    const savePromise = flushSave(true);
    const firstResult = await new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), 15_000);
      void savePromise.then((result) => {
        window.clearTimeout(timeout);
        resolve(result);
      });
    });
    if (!firstResult) {
      return false;
    }

    const stillDirty = hasUnsavedNoteChanges(
      selectedNoteRef.current,
      draftRef.current.title,
      draftRef.current.content,
    );

    return stillDirty ? flushSave(true) : true;
  }, [flushSave]);

  // Gate note/category/new-note navigation behind autosave. If there is nothing
  // pending, navigate immediately. Otherwise flush; only surface the in-app
  // dialog when the save actually fails.
  const requestNavigation = useCallback(
    async (action: () => void | Promise<void>): Promise<void> => {
      const navigationRequestId = navigationRequestRef.current + 1;
      navigationRequestRef.current = navigationRequestId;
      const dirty = hasUnsavedNoteChanges(
        selectedNoteRef.current,
        draftRef.current.title,
        draftRef.current.content,
      );
      const pending =
        dirty ||
        autosaveTimerRef.current !== null ||
        saveQueueRef.current.isBusy();

      if (!pending) {
        await action();
        return;
      }

      const ok = await flushSave();
      if (navigationRequestRef.current !== navigationRequestId) {
        return;
      }
      if (ok || !confirmUnsavedSwitchRef.current) {
        await action();
        return;
      }

      setPendingNavigationAction(() => action);
      setIsSaveFailedDialogOpen(true);
    },
    [flushSave],
  );

  const clearSelectedNote = (): void => {
    selectionRequestRef.current += 1;
    setSelectedNote(null);
    setDraftTitle("");
    setDraftContent("");
    setSaveStatus("Idle");
  };

  const loadImportedNasbkData = useCallback(async (result: NasbkImportResult): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api || !result || !result.ok) {
      return;
    }

    if (
      typeof result.title !== "string" ||
      typeof result.contentHtml !== "string" ||
      result.formatVersion === undefined
    ) {
      setSaveStatus("Error");
      console.error("Invalid NASBK format: missing title, contentHtml, or formatVersion.");
      return;
    }

    const title = result.title;
    const contentHtml = result.contentHtml;
    const isRtl = result.metadata ? !!result.metadata.isRtl : true;
    const categoryId = isEditableCategory(activeCategoryRef.current)
      ? activeCategoryRef.current === "all-notes"
        ? null
        : categories.find((c) => c.slug === activeCategoryRef.current)?.id ?? null
      : null;

    // Create the new note in database
    const note = await api.notes.create({
      title,
      contentMarkdown: contentHtml,
      categoryId,
      isRtl,
    });

    if (result.filePath) {
      // Clear any other notes linked to this same file path to prevent conflicts
      const duplicateLinkKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith("nasbook.nasbk.link.") &&
          localStorage.getItem(key) === result.filePath
        ) {
          duplicateLinkKeys.push(key);
        }
      }
      duplicateLinkKeys.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(`nasbook.nasbk.link.${note.id}`, result.filePath);
    }

    // Update list and selection to show the newly imported note
    await refreshNotes();
    selectionRequestRef.current += 1;
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    draftTextRef.current = result.contentText || getPlainTextFromHtml(contentHtml);
    setSaveStatus("Saved");
  }, [categories, refreshNotes]);

  const loadImportedNasbkDataRef = useRef(loadImportedNasbkData);
  useEffect(() => {
    loadImportedNasbkDataRef.current = loadImportedNasbkData;
  }, [loadImportedNasbkData]);

  useEffect(() => {
    let isMounted = true;
    const api = window.nasNotesbook;

    if (!api) {
      setDatabaseStatus("unavailable");
      return () => {
        isMounted = false;
      };
    }

    // Register listener for runtime associated file opens
    const unsubscribeOpenFile = api.nasbk.onOpenFile((fileData) => {
      if (isMounted && fileData && fileData.ok) {
        void requestNavigation(() =>
          loadImportedNasbkDataRef.current(fileData),
        );
      }
    });

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

        const firstNote = nextNotes[0];
        if (firstNote) {
          const requestId = selectionRequestRef.current + 1;
          selectionRequestRef.current = requestId;
          void api.notes
            .getById(firstNote.id)
            .then((note) => {
              if (
                !isMounted ||
                !note ||
                selectionRequestRef.current !== requestId
              ) {
                return;
              }
              setSelectedNote(note);
              setDraftTitle(note.title);
              setDraftContent(note.contentMarkdown);
              draftTextRef.current = getPlainTextFromHtml(note.contentMarkdown);
              setSaveStatus("Idle");
            })
            .catch(() => {
              if (isMounted) {
                setDatabaseStatus("unavailable");
              }
            });
        }

        // Check for associated file opened on startup
        api.nasbk.getStartupFile().then((startupResult) => {
          if (isMounted && startupResult && startupResult.ok) {
            void requestNavigation(() =>
              loadImportedNasbkDataRef.current(startupResult),
            );
          }
        }).catch((err) => {
          console.error("Failed to load startup NASBK file:", err);
        });
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
      unsubscribeOpenFile();
    };
  }, [requestNavigation]);

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
      // If user is typing in a text input/textarea, ignore global single-key shortcuts
      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      // Helper to check if shortcut has modifiers
      const hasModifiers = (shortcut: string) => {
        if (!shortcut) return false;
        return shortcut.includes("Ctrl") || shortcut.includes("Alt") || shortcut.includes("Shift");
      };

      // 1. Save Note
      if (
        eventMatchesShortcut(event, settings.shortcuts.saveNote) &&
        selectedNote &&
        activeCategory !== "trash"
      ) {
        event.preventDefault();
        event.stopPropagation();
        void handleSaveNote();
        return;
      }

      // 1.5 Save as NASBK
      const saveNasbkShortcut = settings.shortcuts.saveNasbk;
      if (
        eventMatchesShortcut(event, saveNasbkShortcut) &&
        selectedNote &&
        activeCategory !== "trash"
      ) {
        event.preventDefault();
        event.stopPropagation();
        void handleSaveNasbk();
        return;
      }

      // If user is typing, skip other non-modifier shortcuts
      // (For example, if they bound a shortcut to a single letter like 'n', don't trigger it while typing)
      
      // 2. New Note
      const newNoteShortcut = settings.shortcuts.newNote;
      if (
        eventMatchesShortcut(event, newNoteShortcut) &&
        (!isTyping || hasModifiers(newNoteShortcut))
      ) {
        event.preventDefault();
        event.stopPropagation();
        void handleCreateNote();
        return;
      }

      // 3. Rename Note
      const renameNoteShortcut = settings.shortcuts.renameNote;
      if (
        eventMatchesShortcut(event, renameNoteShortcut) &&
        selectedNote &&
        activeCategory !== "trash" &&
        (!isTyping || hasModifiers(renameNoteShortcut))
      ) {
        event.preventDefault();
        event.stopPropagation();
        setRenameValue(selectedNote.title);
        setRenamingNoteId(selectedNote.id);
        return;
      }

      // 4. Move Note
      const moveNoteShortcut = settings.shortcuts.moveNote;
      if (
        eventMatchesShortcut(event, moveNoteShortcut) &&
        selectedNote &&
        activeCategory !== "trash" &&
        (!isTyping || hasModifiers(moveNoteShortcut))
      ) {
        event.preventDefault();
        event.stopPropagation();
        setMovePopoverNoteId(selectedNote.id);
        return;
      }

      // 5. Delete Note
      const deleteNoteShortcut = settings.shortcuts.deleteNote;
      if (
        eventMatchesShortcut(event, deleteNoteShortcut) &&
        selectedNote &&
        activeCategory !== "trash" &&
        (!isTyping || hasModifiers(deleteNoteShortcut))
      ) {
        event.preventDefault();
        event.stopPropagation();
        void handleDeleteToTrash();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNote, activeCategory, settings.shortcuts, notes, draftTitle, draftContent]);

  // Debounced autosave: persist AUTOSAVE_DELAY_MS after the user stops typing.
  // Every draft change resets the timer; the timer is skipped entirely when
  // there is no selected note, the note is trashed, or nothing is dirty.
  useEffect(() => {
    nasDebugLog("[TRACE] App autosave useEffect evaluating", {
      reason: "autosaveEvaluate",
      hasSelectedNote: !!selectedNote,
      selectedNoteId: selectedNote?.id,
      activeCategory,
      hasUnsavedChanges,
      draftContentLength: draftContent.length,
      noteContentLength: selectedNote?.contentMarkdown?.length,
    });

    if (!selectedNote || activeCategory === "trash" || !hasUnsavedChanges) {
      return undefined;
    }

    setSaveStatus("Unsaved");
    nasDebugLog("[TRACE] App autosave scheduling timeout", {
      reason: "autosaveSchedule",
      selectedNoteId: selectedNote.id,
      delayMs: AUTOSAVE_DELAY_MS,
    });

    const handle = window.setTimeout(() => {
      nasDebugLog("[TRACE] App autosave timeout fired", {
        reason: "autosaveFire",
        selectedNoteId: selectedNoteRef.current?.id,
        currentDraftLength: draftRef.current.content.length,
      });
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

  // Main-process close handshake. This covers both the custom title-bar button
  // and native close requests such as Alt+F4.
  useEffect(() => {
    const api = window.nasNotesbook;
    if (!api?.window.onCloseRequested) {
      return undefined;
    }

    return api.window.onCloseRequested(() => {
      if (closeRequestInProgressRef.current) {
        return;
      }

      closeRequestInProgressRef.current = true;
      void flushSaveBeforeClose().then((ok) => {
        if (ok) {
          void api.window.confirmClose().catch((error) => {
            closeRequestInProgressRef.current = false;
            console.error("Failed to confirm window close:", error);
          });
          return;
        }

        setPendingNavigationAction(() => () => {
          void api.window.confirmClose();
        });
        setIsSaveFailedDialogOpen(true);
      });
    });
  }, [flushSaveBeforeClose]);

  const doSelectNote = async (id: number): Promise<void> => {
    const requestId = selectionRequestRef.current + 1;
    selectionRequestRef.current = requestId;
    const note = await window.nasNotesbook?.notes.getById(id);

    if (!note || selectionRequestRef.current !== requestId) {
      return;
    }

    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    draftTextRef.current = getPlainTextFromHtml(note.contentMarkdown);
    setSaveStatus("Idle");
  };

  const handleSelectNote = (id: number): void => {
    if (id === selectedNote?.id) {
      return;
    }
    void requestNavigation(() => doSelectNote(id));
  };

  const doCreateNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (
      !api ||
      !isEditableCategory(activeCategory) ||
      createInProgressRef.current
    ) {
      return;
    }

    createInProgressRef.current = true;
    try {
      const categoryId =
        activeCategory === "all-notes" ? null : activeCategoryRecord?.id ?? null;
      const note = await api.notes.create({ categoryId, isRtl: true });
      selectionRequestRef.current += 1;
      await refreshNotes();
      setSelectedNote(note);
      setDraftTitle(note.title);
      setDraftContent(note.contentMarkdown);
      draftTextRef.current = getPlainTextFromHtml(note.contentMarkdown);
      setSaveStatus("Saved");
    } finally {
      createInProgressRef.current = false;
    }
  };

  const handleCreateNote = (): void => {
    if (!window.nasNotesbook || !isEditableCategory(activeCategory)) {
      return;
    }
    void requestNavigation(doCreateNote);
  };

  const handleSelectCategory = (category: CategorySlug): void => {
    if (category === activeCategory) {
      return;
    }
    void requestNavigation(() => setActiveCategory(category));
  };

  // Manual save / Ctrl+S: flush any pending autosave and persist immediately.
  const handleSaveNote = async (): Promise<void> => {
    await flushSave(true);
  };

  const handleToggleLock = async (): Promise<void> => {
    const api = window.nasNotesbook;
    const note = selectedNoteRef.current;
    if (!api || !note) return;

    if (!note.isLocked) {
      const saved = await flushSave(true);
      if (!saved) return;
    }

    const updated = await api.notes.setLocked(note.id, !note.isLocked);
    setSelectedNote(updated);
    selectedNoteRef.current = updated;
    await refreshNotes();
    setSaveStatus("Saved");
  };

  // Cancel a queued autosave for a note before a list action mutates it, so a
  // stale debounced write cannot race the delete/rename/move.
  const cancelAutosaveFor = (id: number): void => {
    if (selectedNoteRef.current?.id === id && autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const deleteNoteById = async (id: number): Promise<void> => {
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

  const handleDeleteNoteById = async (id: number): Promise<void> => {
    if (selectedNoteRef.current?.id === id) {
      await requestNavigation(() => deleteNoteById(id));
      return;
    }
    await deleteNoteById(id);
  };

  const renameNote = async (id: number, title: string): Promise<void> => {
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

  const handleRenameNote = async (id: number, title: string): Promise<void> => {
    if (selectedNoteRef.current?.id === id) {
      await requestNavigation(() => renameNote(id, title));
      return;
    }
    await renameNote(id, title);
  };

  const moveNote = async (
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
    const nextNotes = await refreshNotes();

    if (selectedNoteRef.current?.id === id) {
      const belongsToActiveCategory =
        activeCategory === "all-notes" ||
        (activeCategoryRecord && categoryId === activeCategoryRecord.id);

      if (!belongsToActiveCategory) {
        const next = nextNotes[0] ?? null;
        if (next) {
          void doSelectNote(next.id);
        } else {
          clearSelectedNote();
        }
      } else {
        setSelectedNote(updated);
        setDraftTitle(updated.title);
        setDraftContent(updated.contentMarkdown);
        setSaveStatus("Saved");
      }
    }
  };

  const handleMoveNote = async (
    id: number,
    categoryId: number | null,
  ): Promise<void> => {
    if (selectedNoteRef.current?.id === id) {
      await requestNavigation(() => moveNote(id, categoryId));
      return;
    }
    await moveNote(id, categoryId);
  };

  // Import a single .md file as a new note in the current category. Conversion
  // and sanitization happen here in the renderer; main only reads the file.
  const importMarkdown = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

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
    selectionRequestRef.current += 1;
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    draftTextRef.current = getPlainTextFromHtml(note.contentMarkdown);
    setSaveStatus("Saved");
  };

  const handleImportMarkdown = async (): Promise<void> => {
    await requestNavigation(importMarkdown);
  };

  const handleSaveNasbk = async (): Promise<void> => {
    const api = window.nasNotesbook;
    const note = selectedNoteRef.current;
    if (!api || !note) {
      return;
    }

    if (!(await flushSave())) {
      return;
    }
    setSaveStatus("Saving");
    const title = draftRef.current.title;
    const content = draftRef.current.content;
    const plainText = draftTextRef.current || getPlainTextFromHtml(content);

    const result = await api.nasbk.saveFile({
      title,
      contentHtml: content,
      contentText: plainText,
      metadata: {
        isRtl: !!note.isRtl,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      formatVersion: 1,
    });

    if (result.ok && result.path) {
      localStorage.setItem(`nasbook.nasbk.link.${note.id}`, result.path);
      setSaveStatus("Saved");
    } else if (result.canceled) {
      setSaveStatus("Idle");
    } else {
      setSaveStatus("Error");
    }
  };

  const importNasbk = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api) {
      return;
    }

    // Do NOT overwrite or clear the active note if the dialog is canceled or errors out.
    const result = await api.nasbk.importFile();
    if (!result.ok) {
      if (result.error) {
        setSaveStatus("Error");
        console.error("Import NASBK failed:", result.error);
      }
      return;
    }

    await loadImportedNasbkData(result);
  };

  const handleImportNasbk = async (): Promise<void> => {
    await requestNavigation(importNasbk);
  };

  const handleExportNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api || !selectedNoteRef.current) {
      return;
    }

    if (!(await flushSave())) {
      return;
    }
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

    if (!(await flushSave())) {
      return;
    }
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

  const handleUpdateCategory = useCallback(
    async (input: UpdateCategoryInput): Promise<void> => {
      const api = window.nasNotesbook;
      if (!api) {
        return;
      }

      const updated = await api.categories.update(input);
      setCategories((current) =>
        current.map((category) =>
          category.id === updated.id ? updated : category,
        ),
      );
    },
    [],
  );

  const handleOpenDataFolder = (): void => {
    void window.nasNotesbook?.app.openDataFolder();
  };

  const handleDeleteToTrash = async (): Promise<void> => {
    const note = selectedNoteRef.current;
    if (!note || !window.nasNotesbook) {
      return;
    }
    await handleDeleteNoteById(note.id);
  };

  const handleRestore = async (): Promise<void> => {
    const note = selectedNoteRef.current;
    if (!note || !window.nasNotesbook) {
      return;
    }

    await window.nasNotesbook.notes.restore(note.id);
    const nextNotes = await refreshNotes();
    const next = nextNotes[0];
    if (next) {
      await doSelectNote(next.id);
    } else {
      clearSelectedNote();
    }
  };

  const performDeletePermanent = async (): Promise<void> => {
    const note = selectedNoteRef.current;
    if (!note || !window.nasNotesbook) {
      return;
    }

    await window.nasNotesbook.notes.deletePermanent(note.id);
    localStorage.removeItem(`nasbook.nasbk.link.${note.id}`);
    const nextNotes = await refreshNotes();
    const next = nextNotes[0];
    if (next) {
      await doSelectNote(next.id);
    } else {
      clearSelectedNote();
    }
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

  const handleDraftContentChange = (content: string, text: string): void => {
    nasDebugLog("[TRACE] App handleDraftContentChange", {
      reason: "onContentChange",
      noteId: selectedNoteRef.current?.id,
      selectedNoteId: selectedNoteRef.current?.id,
      draftContentLength: content.length,
      textLength: text.length,
    });
    setDraftContent(content);
    draftTextRef.current = text;
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
      aria-label="NASbook workspace"
      onContextMenu={handleOpenContextMenu}
      data-focus-mode={isFocusMode ? "true" : "false"}
      data-notes-collapsed={notesListCollapsed ? "true" : "false"}
      style={{
        "--nav-rail-width": `${navRailExpanded ? 196 : 60}px`,
        "--notes-list-width": `${notesListWidth}px`,
      } as React.CSSProperties}
    >
      <TitleBar language={settings.language} />
      <NavigationRail
        activeCategory={activeCategory}
        categories={categories}
        railIconMode={settings.railIconMode}
        language={settings.language}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectCategory={handleSelectCategory}
        onUpdateCategory={handleUpdateCategory}
        expanded={navRailExpanded}
        onToggleExpanded={handleToggleNavRail}
        theme={settings.theme}
        onThemeChange={(theme) => handleUpdateSettings({ theme })}
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
        renamingNoteId={renamingNoteId}
        setRenamingNoteId={setRenamingNoteId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        movePopoverNoteId={movePopoverNoteId}
        setMovePopoverNoteId={setMovePopoverNoteId}
        onImportMarkdown={() => {
          void handleImportMarkdown();
        }}
        onImportNasbk={() => {
          void handleImportNasbk();
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
      <button
        type="button"
        className="notes-pane-toggle"
        data-collapsed={notesListCollapsed ? "true" : "false"}
        aria-label={
          notesListCollapsed
            ? settings.language === "ar" ? "إظهار قائمة الملاحظات" : "Show notes list"
            : settings.language === "ar" ? "إخفاء قائمة الملاحظات" : "Hide notes list"
        }
        data-tooltip={
          notesListCollapsed
            ? settings.language === "ar" ? "إظهار قائمة الملاحظات" : "Show notes list"
            : settings.language === "ar" ? "إخفاء قائمة الملاحظات" : "Hide notes list"
        }
        onClick={handleToggleNotesList}
      >
        <PanelToggleIcon />
      </button>
      <NoteEditorArea
        activeCategoryName={activeCategoryName}
        draftContent={draftContent}
        draftTitle={draftTitle}
        editorDensity={settings.editorDensity}
        editorDirection={settings.editorDirection}
        shortcuts={settings.shortcuts}
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
        onToggleLock={() => {
          void handleToggleLock();
        }}
        onToggleTheme={() => {
          handleUpdateSettings({
            theme: getToggledLightDarkTheme(settings.theme),
          });
        }}
        onThemeChange={(theme) => handleUpdateSettings({ theme })}
        onTitleChange={handleDraftTitleChange}
        onExportNote={() => {
          void handleExportNote();
        }}
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
          closeRequestInProgressRef.current = false;
        }}
        onConfirm={() => {
          setIsSaveFailedDialogOpen(false);
          const action = pendingNavigationAction;
          setPendingNavigationAction(null);
          action?.();
        }}
      />
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
            appInfo={appInfo}
            isOpen
            settings={settings}
            onClose={() => setIsSettingsOpen(false)}
            onOpenDataFolder={handleOpenDataFolder}
            onUpdateSettings={handleUpdateSettings}
          />
        </Suspense>
      )}
      <StatusFooter
        databaseStatus={databaseStatus}
        notesCount={notesCount}
        saveStatus={saveStatus}
        language={settings.language}
        editorDirection={settings.editorDirection}
        appName={appInfo?.name}
        appVersion={appInfo?.version}
      />
    </main>
  );
}

function eventMatchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false;
  const parts = shortcut.split("+");
  const hasCtrl = parts.includes("Ctrl");
  const hasAlt = parts.includes("Alt");
  const hasShift = parts.includes("Shift");
  const key = parts[parts.length - 1].toLowerCase();

  const eventCtrl = event.ctrlKey || event.metaKey;
  const eventAlt = event.altKey;
  const eventShift = event.shiftKey;
  const eventKey = event.key.toLowerCase();

  const isKeyMatch =
    eventKey === key ||
    event.code === "Key" + key.toUpperCase() ||
    event.code === "Digit" + key;

  return (
    hasCtrl === eventCtrl &&
    hasAlt === eventAlt &&
    hasShift === eventShift &&
    isKeyMatch
  );
}

