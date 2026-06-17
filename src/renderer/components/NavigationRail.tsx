import type { CategoryDefinition, CategorySlug } from "../../shared/categories";

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
            key={category.slug}
            onClick={() => onSelectCategory(category.slug)}
            title={category.name}
            type="button"
          >
            <span aria-hidden="true">{category.name.slice(0, 2)}</span>
            <span className="sr-only">{category.name}</span>
          </button>
        ))}
      </nav>

      <nav className="rail-section rail-section-bottom" aria-label="System">
        {secondaryCategories.map((category) => (
          <button
            className="rail-button"
            data-active={category.slug === activeCategory}
            key={category.slug}
            onClick={() => onSelectCategory(category.slug)}
            title={category.name}
            type="button"
          >
            <span aria-hidden="true">{category.name.slice(0, 2)}</span>
            <span className="sr-only">{category.name}</span>
          </button>
        ))}
        <button className="rail-button" title="Settings" type="button">
          <span aria-hidden="true">⚙</span>
          <span className="sr-only">Settings</span>
        </button>
      </nav>
    </aside>
  );
}
