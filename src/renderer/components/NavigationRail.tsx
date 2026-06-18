import { useEffect, useState } from "react";
import type { CategoryDefinition, CategorySlug } from "../../shared/categories";
import type { RailIconMode } from "../../shared/settings";

interface IconResolution {
  readonly type: "image" | "inline" | "text";
  readonly value: string;
}

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
      type: mode === "adaptive" ? "inline" : "image",
      value,
    };
  }

  return { type: "text", value: name.slice(0, 2).toUpperCase() };
};

function InlineRailIcon({ src }: { readonly src: string }): JSX.Element {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Icon request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((markup) => {
        if (isMounted) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSvgMarkup(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!svgMarkup) {
    return <span className="rail-icon-mask" style={{ "--icon-url": `url(${src})` } as React.CSSProperties} />;
  }

  return (
    <span
      className="rail-icon-inline"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

const renderRailIcon = (icon: IconResolution): JSX.Element | string => {
  if (icon.type === "image") {
    return <img className="rail-icon-image" src={icon.value} alt="" />;
  }

  if (icon.type === "inline") {
    return <InlineRailIcon src={icon.value} />;
  }

  return icon.value;
};

interface NavigationRailProps {
  readonly activeCategory: CategorySlug;
  readonly categories: readonly CategoryDefinition[];
  readonly railIconMode: RailIconMode;
  readonly onOpenSettings: () => void;
  readonly onSelectCategory: (category: CategorySlug) => void;
}

export function NavigationRail({
  activeCategory,
  categories,
  railIconMode,
  onOpenSettings,
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
              data-tooltip={category.name}
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
              data-tooltip={category.name}
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
          data-tooltip="Settings"
          onClick={onOpenSettings}
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
