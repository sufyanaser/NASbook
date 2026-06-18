import { useEffect, useMemo, useState } from "react";
import {
  defaultCategories,
  type CategoryRecord,
  type CategorySlug,
} from "../shared/categories";
import { hasUnsavedNoteChanges } from "../shared/dirtyState";
import type { AppInfo, NoteRecord, NoteListItem } from "../shared/ipc";
import {
  defaultAppSettings,
  type AppSettings,
} from "../shared/settings";
import { NavigationRail } from "./components/NavigationRail";
import { NoteEditorArea } from "./components/NoteEditorArea";
import { NotesListColumn } from "./components/NotesListColumn";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusFooter } from "./components/StatusFooter";

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

  const activeCategoryRecord = useMemo(() => {
    return categories.find((category) => category.slug === activeCategory);
  }, [activeCategory, categories]);

  const activeCategoryName = activeCategoryRecord?.name ?? "All Notes";
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

    return window.confirm("You have unsaved changes. Discard them?");
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

  const handleDeletePermanent = async (): Promise<void> => {
    if (!selectedNote || !window.nasNotesbook) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this note permanently? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    await window.nasNotesbook.notes.deletePermanent(selectedNote.id);
    await refreshNotes();
    clearSelectedNote();
  };

  const handleDraftTitleChange = (title: string): void => {
    setDraftTitle(title);
    setSaveStatus("Unsaved");
  };

  const handleDraftContentChange = (content: string): void => {
    setDraftContent(content);
    setSaveStatus("Unsaved");
  };

  return (
    <main
      className="app-shell"
      aria-label="NAS Notesbook workspace"
      dir="ltr"
    >
      <div className="workspace-frame">
        <NavigationRail
          activeCategory={activeCategory}
          categories={categories}
          railIconMode={settings.railIconMode}
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
          onContentChange={handleDraftContentChange}
          onDeletePermanent={() => {
            void handleDeletePermanent();
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
          onTitleChange={handleDraftTitleChange}
        />
      </div>
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
      />
    </main>
  );
}
