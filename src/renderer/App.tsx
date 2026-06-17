import { useMemo, useState } from "react";
import { defaultCategories, type CategorySlug } from "../shared/categories";
import { NavigationRail } from "./components/NavigationRail";
import { NoteEditorArea } from "./components/NoteEditorArea";
import { NotesListColumn } from "./components/NotesListColumn";
import { StatusFooter } from "./components/StatusFooter";

export function App(): JSX.Element {
  const [activeCategory, setActiveCategory] =
    useState<CategorySlug>("all-notes");

  const activeCategoryName = useMemo(() => {
    return (
      defaultCategories.find((category) => category.slug === activeCategory)
        ?.name ?? "All Notes"
    );
  }, [activeCategory]);

  return (
    <main
      className="app-shell"
      aria-label="NAS Notesbook workspace"
      dir="ltr"
    >
      <div className="workspace-frame">
        <NavigationRail
          activeCategory={activeCategory}
          categories={defaultCategories}
          onSelectCategory={setActiveCategory}
        />
        <NotesListColumn activeCategoryName={activeCategoryName} />
        <NoteEditorArea activeCategoryName={activeCategoryName} />
      </div>
      <StatusFooter activeCategoryName={activeCategoryName} />
    </main>
  );
}
