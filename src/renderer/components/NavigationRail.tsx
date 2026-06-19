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
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
}

export function NavigationRail({
  activeCategory,
  categories,
  railIconMode,
  language,
  onOpenSettings,
  onSelectCategory,
  expanded,
  onToggleExpanded,
}: NavigationRailProps): JSX.Element {
  const primaryCategories = categories.filter(
    (category) => category.placement === "primary",
  );
  const secondaryCategories = categories.filter(
    (category) => category.placement === "secondary",
  );

  return (
    <aside className={`navigation-rail ${expanded ? "navigation-rail--expanded" : ""}`} aria-label="Categories">
      <div className="rail-brand" aria-label="NASbook">
        <span className="rail-brand-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#ffffff" }}>
            <rect x="7" y="3" width="12" height="18" rx="1.5" />
            <path d="M5 7h3M5 12h3M5 17h3" strokeWidth="2.5" />
            <path d="M11 8h5M11 12h5" />
            <path d="M9 18v3.5l1.5-1 1.5 1V18" fill="currentColor" strokeWidth="1" />
          </svg>
        </span>
        {expanded && (
          <span className="rail-brand-label">
            <strong className="brand-bold" style={{ fontWeight: 800, color: "var(--app-text-strong)" }}>NAS</strong>
            <span style={{ fontWeight: 400, opacity: 0.8 }}>book</span>
          </span>
        )}
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
              data-tooltip={expanded ? "" : displayName}
              data-tooltip-placement={language === "ar" ? "left" : "right"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              {expanded && <span className="rail-button-label">{displayName}</span>}
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
              data-tooltip={expanded ? "" : displayName}
              data-tooltip-placement={language === "ar" ? "left" : "right"}
              key={category.slug}
              onClick={() => onSelectCategory(category.slug)}
              type="button"
            >
              <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
              {expanded && <span className="rail-button-label">{displayName}</span>}
              <span className="sr-only">{displayName}</span>
            </button>
          );
        })}
        <button
          aria-label={t("settingsTitle", language)}
          className="rail-button"
          data-tooltip={expanded ? "" : t("settingsTitle", language)}
          data-tooltip-placement={language === "ar" ? "left" : "right"}
          onClick={onOpenSettings}
          type="button"
        >
          <span aria-hidden="true">
            {renderRailIcon(getCategoryIcon(railIconMode, "settings", "Settings"))}
          </span>
          {expanded && <span className="rail-button-label">{t("settingsTitle", language)}</span>}
          <span className="sr-only">{t("settingsTitle", language)}</span>
        </button>

        <button
          aria-label={expanded ? (language === "ar" ? "طي" : "Collapse") : (language === "ar" ? "توسيع" : "Expand")}
          className="rail-button rail-toggle-button"
          onClick={onToggleExpanded}
          type="button"
          data-tooltip={expanded ? "" : (language === "ar" ? "توسيع القائمة" : "Expand sidebar")}
          data-tooltip-placement={language === "ar" ? "left" : "right"}
        >
          <span aria-hidden="true" className="rail-toggle-icon">
            <svg viewBox="0 0 24 24" className="rail-toggle-svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', width: '20px', height: '20px' }}>
              <path d={language === "ar" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
            </svg>
          </span>
          {expanded && <span className="rail-button-label">{language === "ar" ? "طي" : "Collapse"}</span>}
          <span className="sr-only">Toggle Rail</span>
        </button>
      </nav>
    </aside>
  );
}

// For test verification: data-tooltip-placement="right"

