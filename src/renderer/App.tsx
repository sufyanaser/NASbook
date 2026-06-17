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

export function App(): JSX.Element {
  const [categories, setCategories] =
    useState<readonly CategoryDefinition[]>(defaultCategories);
  const [activeCategory, setActiveCategory] =
    useState<CategorySlug>("all-notes");

  useEffect(() => {
    let isMounted = true;

    window.nasNotesbook?.categories
      .list()
      .then((nextCategories) => {
        if (isMounted && nextCategories.length > 0) {
          setCategories(nextCategories);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategories(defaultCategories);
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
      <StatusFooter activeCategoryName={activeCategoryName} />
    </main>
  );
}
