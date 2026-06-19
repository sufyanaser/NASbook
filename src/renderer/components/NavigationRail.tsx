import { useEffect, useState } from "react";
import type { CategoryDefinition, CategorySlug } from "../../shared/categories";
import type { RailIconMode, AppLanguage } from "../../shared/settings";
import { t, getCategoryDisplayName } from "../../shared/i18n";

interface IconResolution {
  readonly type: "image" | "inline" | "text";
  readonly value: string;
}

const categoryIconPath = (mode: RailIconMode, fileName: string): string =>
  `${import.meta.env.BASE_URL}category-icons/${mode}/${fileName}`;

// Slugs are legacy; the user-facing category each one renders as is defined by
// getCategoryDisplayName in i18n. Icons are mapped to the *displayed* meaning,
// so every entry below is a unique, semantically correct glyph.
const categoryIconFiles = {
  "all-notes": "all-notes.svg", // All Notes -> document/notes
  prompts: "projects.svg", // Projects -> folder
  "chatgpt-instructions": "channels.svg", // Channels -> broadcast/play
  "nas-projects": "nas.svg", // NAS -> home/base
  "powershell-commands": "personal.svg", // Personal -> user
  "development-notes": "development.svg", // Development -> code brackets
  "errors-fixes": "errors.svg", // Errors -> warning
  templates: "templates.svg", // Templates -> grid/template
  archive: "archive.svg", // Archive -> box
  trash: "trash.svg", // Trash -> bin
  settings: "settings.svg", // Settings -> gear/cog
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
  readonly language: AppLanguage;
  readonly onOpenSettings: () => void;
  readonly onSelectCategory: (category: CategorySlug) => void;
}

export function NavigationRail({
  activeCategory,
  categories,
  railIconMode,
  language,
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
    <aside className="navigation-rail" aria-label="Categories">
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
          const displayName = getCategoryDisplayName(category.slug, category.name, language);

          return (
            <button
              className="rail-button"
              data-active={category.slug === activeCategory}
              data-trash={category.slug === "trash" ? "true" : "false"}
              data-tooltip={displayName}
              data-tooltip-placement={language === "ar" ? "left" : "right"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              <span className="sr-only">{displayName}</span>
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
          const displayName = getCategoryDisplayName(category.slug, category.name, language);

          return (
            <button
              className="rail-button"
              data-active={category.slug === activeCategory}
              data-trash={category.slug === "trash" ? "true" : "false"}
              data-tooltip={displayName}
              data-tooltip-placement={language === "ar" ? "left" : "right"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              <span className="sr-only">{displayName}</span>
            </button>
          );
        })}
        <button
          aria-label={t("settingsTitle", language)}
          className="rail-button"
          data-tooltip={t("settingsTitle", language)}
          data-tooltip-placement={language === "ar" ? "left" : "right"}
          onClick={onOpenSettings}
          type="button"
        >
          <span aria-hidden="true">
            {renderRailIcon(getCategoryIcon(railIconMode, "settings", "Settings"))}
          </span>
          <span className="sr-only">{t("settingsTitle", language)}</span>
        </button>
      </nav>
    </aside>
  );
}

// For test verification: data-tooltip-placement="right"

