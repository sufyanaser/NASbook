import type { CategoryDefinition, CategorySlug } from "../../shared/categories";

type RailIconMode = "colored" | "adaptive";

interface IconResolution {
  readonly type: "image" | "mask" | "text";
  readonly value: string;
}

const railIconMode: RailIconMode = "colored";

const categoryIconPath = (mode: RailIconMode, fileName: string): string =>
  `${import.meta.env.BASE_URL}category-icons/${mode}/${fileName}`;

const categoryIconFiles = {
  "all-notes": "all-notes.svg",
  prompts: "channels.svg",
  "chatgpt-instructions": "nas.svg",
  "nas-projects": "projects.svg",
  "powershell-commands": "development.svg",
  "development-notes": "development.svg",
  "errors-fixes": "errors.svg",
  templates: "templates.svg",
  archive: "archive.svg",
  trash: "trash.svg",
  settings: "settings.svg",
} satisfies Partial<Record<CategorySlug | "settings", string>>;

const getCategoryIcon = (
  mode: RailIconMode,
  slug: CategorySlug | "settings",
  name: string,
): IconResolution => {
  const fileName = categoryIconFiles[slug];

  if (fileName) {
    const value = categoryIconPath(mode, fileName);

    return {
      type: mode === "adaptive" ? "mask" : "image",
      value,
    };
  }

  return { type: "text", value: name.slice(0, 2).toUpperCase() };
};

const renderRailIcon = (icon: IconResolution): JSX.Element | string => {
  if (icon.type === "image") {
    return <img className="rail-icon-image" src={icon.value} alt="" />;
  }

  if (icon.type === "mask") {
    return (
      <span
        className="rail-icon-mask"
        style={{ "--icon-url": `url(${icon.value})` } as React.CSSProperties}
      />
    );
  }

  return icon.value;
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
        {primaryCategories.map((category) => {
          const iconRes = getCategoryIcon(
            railIconMode,
            category.slug,
            category.name,
          );

          return (
            <button
              className="rail-button"
              data-active={category.slug === activeCategory}
              data-trash={category.slug === "trash" ? "true" : "false"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              title={category.name}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              <span className="sr-only">{category.name}</span>
            </button>
          );
        })}
      </nav>

      <nav className="rail-section rail-section-bottom" aria-label="System">
        {secondaryCategories.map((category) => {
          const iconRes = getCategoryIcon(
            railIconMode,
            category.slug,
            category.name,
          );

          return (
            <button
              className="rail-button"
              data-active={category.slug === activeCategory}
              data-trash={category.slug === "trash" ? "true" : "false"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              title={category.name}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              <span className="sr-only">{category.name}</span>
            </button>
          );
        })}
        <button
          aria-label="Settings"
          className="rail-button"
          title="Settings"
          type="button"
        >
          <span aria-hidden="true">
            {renderRailIcon(getCategoryIcon(railIconMode, "settings", "Settings"))}
          </span>
          <span className="sr-only">Settings</span>
        </button>
      </nav>
    </aside>
  );
}
