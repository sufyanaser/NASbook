import type { CategoryDefinition, CategorySlug } from "../../shared/categories";

const categoryIcons: Record<string, string> = {
  "all-notes": "AN",
  "prompts": "PR",
  "chatgpt-instructions": "CI",
  "nas-projects": "NP",
  "powershell-commands": "PC",
  "development-notes": "DN",
  "errors-fixes": "EF",
  "templates": "TP",
  "archive": "AR",
  "trash": "🗑️",
};

const getCategoryIcon = (slug: string, name: string): string => {
  return categoryIcons[slug] || name.slice(0, 2).toUpperCase();
};

interface NavigationRailProps {
  readonly activeCategory: CategorySlug;
  readonly categories: readonly CategoryDefinition[];
  readonly onSelectCategory: (category: CategorySlug) => void;
}

export function NavigationRail({
  activeCategory,
  categories,
  onSelectCategory,
}: NavigationRailProps): JSX.Element {
  const primaryCategories = categories.filter(
    (category) => category.placement === "primary",
  );
  const secondaryCategories = categories.filter(
    (category) => category.placement === "secondary",
  );

  return (
    <aside className="navigation-rail" aria-label="Categories" dir="ltr">
      <div className="rail-brand" aria-label="NAS Notesbook">
        NAS
      </div>

      <nav className="rail-section" aria-label="Primary categories">
        {primaryCategories.map((category) => (
          <button
            className="rail-button"
            data-active={category.slug === activeCategory}
            data-trash={category.slug === "trash" ? "true" : "false"}
            key={category.slug}
            onClick={() => onSelectCategory(category.slug)}
            title={category.name}
            type="button"
          >
            <span aria-hidden="true" style={{ fontSize: "16px" }}>
              {getCategoryIcon(category.slug, category.name)}
            </span>
            <span className="sr-only">{category.name}</span>
          </button>
        ))}
      </nav>

      <nav className="rail-section rail-section-bottom" aria-label="System">
        {secondaryCategories.map((category) => (
          <button
            className="rail-button"
            data-active={category.slug === activeCategory}
            data-trash={category.slug === "trash" ? "true" : "false"}
            key={category.slug}
            onClick={() => onSelectCategory(category.slug)}
            title={category.name}
            type="button"
          >
            <span aria-hidden="true" style={{ fontSize: "16px" }}>
              {getCategoryIcon(category.slug, category.name)}
            </span>
            <span className="sr-only">{category.name}</span>
          </button>
        ))}
        <button className="rail-button" title="Settings" type="button">
          <span aria-hidden="true" style={{ fontSize: "16px" }}>⚙</span>
          <span className="sr-only">Settings</span>
        </button>
      </nav>
    </aside>
  );
}
