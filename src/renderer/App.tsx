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

type DatabaseStatus = "ready" | "unavailable";
type SaveStatus = "Idle" | "Unsaved" | "Saving" | "Saved" | "Error";

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

  const confirmDiscardChanges = (): boolean => {
    if (!hasUnsavedChanges) {
      return true;
    }

    if (!settings.confirmUnsavedSwitch) {
      return true;
    }

    return window.confirm(t("dialogDeleteDiscardPrompt", settings.language));
  };

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

  const handleSelectNote = async (id: number): Promise<void> => {
    if (id === selectedNote?.id || !confirmDiscardChanges()) {
      return;
    }

    const note = await window.nasNotesbook?.notes.getById(id);

    if (!note) {
      return;
    }

    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.contentMarkdown);
    setSaveStatus("Idle");
  };

  const handleCreateNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (
      !api ||
      !isEditableCategory(activeCategory) ||
      !confirmDiscardChanges()
    ) {
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

  const handleSelectCategory = (category: CategorySlug): void => {
    if (category === activeCategory || !confirmDiscardChanges()) {
      return;
    }

    setActiveCategory(category);
  };

  const handleSaveNote = async (): Promise<void> => {
    const api = window.nasNotesbook;
    if (!api || !selectedNote) {
      return;
    }

    setSaveStatus("Saving");

    try {
      const note = await api.notes.update({
        id: selectedNote.id,
        title: draftTitle,
        contentMarkdown: draftContent,
        categoryId: selectedNote.categoryId,
        isRtl: selectedNote.isRtl,
      });
      await refreshNotes();
      setSelectedNote(note);
      setDraftTitle(note.title);
      setDraftContent(note.contentMarkdown);
      setSaveStatus("Saved");
    } catch {
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
    >
      <div className="workspace-frame">
        <NavigationRail
          activeCategory={activeCategory}
          categories={categories}
          railIconMode={settings.railIconMode}
          language={settings.language}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectCategory={handleSelectCategory}
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
          onCreateNote={() => {
            void handleCreateNote();
          }}
          onSelectNote={(id) => {
            void handleSelectNote(id);
          }}
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
      </div>
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
