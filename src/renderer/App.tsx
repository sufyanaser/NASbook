import { useEffect, useMemo, useState } from "react";
import {
  defaultCategories,
  type CategoryDefinition,
  type CategorySlug,
} from "../shared/categories";
import { NavigationRail } from "./components/NavigationRail";
import { NoteEditorArea } from "./components/NoteEditorArea";
import { NotesListColumn } from "./components/NotesListColumn";
import { StatusFooter } from "./components/StatusFooter";

type DatabaseStatus = "ready" | "unavailable";

export function App(): JSX.Element {
  const [categories, setCategories] =
    useState<readonly CategoryDefinition[]>(defaultCategories);
  const [activeCategory, setActiveCategory] =
    useState<CategorySlug>("all-notes");
  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus>("unavailable");
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const api = window.nasNotesbook;

    if (!api) {
      setDatabaseStatus("unavailable");
      return () => {
        isMounted = false;
      };
    }

    Promise.all([api.categories.list(), api.notes.list()])
      .then(([nextCategories, nextNotes]) => {
        if (!isMounted) {
          return;
        }

        setDatabaseStatus("ready");
        setCategories(
          nextCategories.length > 0 ? nextCategories : defaultCategories,
        );
        setNotesCount(nextNotes.length);
      })
      .catch(() => {
        if (isMounted) {
          setDatabaseStatus("unavailable");
          setCategories(defaultCategories);
          setNotesCount(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategoryName = useMemo(() => {
    return (
      categories.find((category) => category.slug === activeCategory)?.name ??
      "All Notes"
    );
  }, [activeCategory, categories]);

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
          onSelectCategory={setActiveCategory}
        />
        <NotesListColumn activeCategoryName={activeCategoryName} />
        <NoteEditorArea activeCategoryName={activeCategoryName} />
      </div>
      <StatusFooter
        activeCategoryName={activeCategoryName}
        categoriesCount={categories.length}
        databaseStatus={databaseStatus}
        notesCount={notesCount}
      />
    </main>
  );
}
