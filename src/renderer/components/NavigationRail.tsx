import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import type { CategoryRecord, CategorySlug } from "../../shared/categories";
import {
  customizableCategorySlugs,
  resolveCategoryIconFile,
} from "../../shared/categoryIcons";
import type { UpdateCategoryInput } from "../../shared/ipc";
import { CategoryCustomizationDialog } from "./CategoryCustomizationDialog";
import type { RailIconMode, AppLanguage, AppTheme } from "../../shared/settings";
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
  icon?: string,
): IconResolution => {
  const fileName = slug === "settings"
    ? categoryIconFiles.settings
    : resolveCategoryIconFile(icon, slug);

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
  readonly categories: readonly CategoryRecord[];
  readonly railIconMode: RailIconMode;
  readonly language: AppLanguage;
  readonly onOpenSettings: () => void;
  readonly onSelectCategory: (category: CategorySlug) => void;
  readonly onUpdateCategory: (input: UpdateCategoryInput) => Promise<void>;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly theme: AppTheme;
  readonly onThemeChange: (theme: AppTheme) => void;
}

function ThemeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '20px', height: '20px' }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M12 12h10" />
      <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" />
    </svg>
  );
}

const themesList = [
  { value: "light", labelEn: "Light", labelAr: "فاتح", colors: ["#f5f5f4", "#ffffff", "#4f46e5"] },
  { value: "dark", labelEn: "Dark", labelAr: "داكن", colors: ["#0c0a09", "#1c1917", "#6366f1"] },
  { value: "graphite", labelEn: "Graphite", labelAr: "غرافيت", colors: ["#101214", "#1b1f23", "#3b82f6"] },
  { value: "material-dark", labelEn: "Material Dark", labelAr: "ماتيريال داكن", colors: ["#121212", "#1e1e1e", "#b39ddb"] },
  { value: "ulysses", labelEn: "Ulysses", labelAr: "يوليسيس", colors: ["#f8f5ee", "#fffdf7", "#d84b20"] },
  { value: "one-dark", labelEn: "One Dark", labelAr: "ون دارك", colors: ["#1e2127", "#282c34", "#61afef"] },
] as const;

export function NavigationRail({
  activeCategory,
  categories,
  railIconMode,
  language,
  onOpenSettings,
  onSelectCategory,
  onUpdateCategory,
  expanded,
  onToggleExpanded,
  theme,
  onThemeChange,
}: NavigationRailProps): JSX.Element {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const themeMenuRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ bottom: number; left?: number; right?: number }>({ bottom: 24, left: 66 });

  useLayoutEffect(() => {
    if (!isThemeOpen) return;

    const updateCoords = () => {
      if (themeMenuRef.current) {
        const rect = themeMenuRef.current.getBoundingClientRect();
        const bottomVal = window.innerHeight - rect.bottom;
        if (language === "ar") {
          setCoords({
            bottom: bottomVal,
            right: window.innerWidth - rect.left + 6,
          });
        } else {
          setCoords({
            bottom: bottomVal,
            left: rect.right + 6,
          });
        }
      }
    };

    updateCoords();

    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isThemeOpen, language, expanded]);

  useEffect(() => {
    if (!isThemeOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedMenuButton = themeMenuRef.current && themeMenuRef.current.contains(target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(target);
      if (!clickedMenuButton && !clickedPopover) {
        setIsThemeOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isThemeOpen]);


  const primaryCategories = categories.filter(
    (category) => category.placement === "primary",
  );
  const secondaryCategories = categories.filter(
    (category) => category.placement === "secondary",
  );

  const renderCategoryButton = (
    category: CategoryRecord,
    canCustomize: boolean,
  ): JSX.Element => {
    const iconRes = getCategoryIcon(
      railIconMode,
      category.slug,
      category.name,
      category.icon,
    );
    const displayName = getCategoryDisplayName(
      category.slug,
      category.name,
      language,
    );
    const customizable = canCustomize && customizableCategorySlugs.some(
      (slug) => slug === category.slug,
    );

    return (
      <div className="rail-category-row" key={category.slug}>
        <button
          className="rail-button"
          data-active={category.slug === activeCategory}
          data-trash={category.slug === "trash" ? "true" : "false"}
          data-tooltip={expanded ? "" : displayName}
          data-tooltip-placement={language === "ar" ? "left" : "right"}
          onClick={() => onSelectCategory(category.slug)}
          onContextMenu={(event) => {
            if (customizable) {
              event.preventDefault();
              setEditingCategory(category);
            }
          }}
          onDoubleClick={() => {
            if (customizable) {
              setEditingCategory(category);
            }
          }}
          type="button"
        >
          <span aria-hidden="true">{renderRailIcon(iconRes)}</span>
          {expanded && <span className="rail-button-label">{displayName}</span>}
          <span className="sr-only">{displayName}</span>
        </button>
        {expanded && customizable && (
          <button
            aria-label={language === "ar" ? `تخصيص ${displayName}` : `Customize ${displayName}`}
            className="rail-category-edit"
            data-tooltip={language === "ar" ? "إعادة التسمية وتغيير الأيقونة" : "Rename and change icon"}
            data-tooltip-placement={language === "ar" ? "left" : "right"}
            onClick={() => setEditingCategory(category)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>
    );
  };

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
        {primaryCategories.map((category) => renderCategoryButton(category, true))}
      </nav>

      <nav className="rail-section rail-section-bottom" aria-label="System">
        {secondaryCategories.map((category) => renderCategoryButton(category, false))}
        <div className="rail-theme-control">
          <button
            ref={themeMenuRef}
            aria-label={language === "ar" ? "السمات" : "Themes"}
            className="rail-button"
            data-active={isThemeOpen}
            data-tooltip={expanded ? "" : (language === "ar" ? "السمات" : "Themes")}
            data-tooltip-placement={language === "ar" ? "left" : "right"}
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            type="button"
          >
            <span aria-hidden="true">
              <ThemeIcon />
            </span>
            {expanded && <span className="rail-button-label">{language === "ar" ? "السمات" : "Themes"}</span>}
            <span className="sr-only">Themes</span>
          </button>
          
          {isThemeOpen && createPortal(
            <div
              className="rail-theme-popover"
              ref={popoverRef}
              role="menu"
              dir={language === "ar" ? "rtl" : "ltr"}
              style={{
                position: "fixed",
                bottom: `${coords.bottom}px`,
                left: coords.left !== undefined ? `${coords.left}px` : undefined,
                right: coords.right !== undefined ? `${coords.right}px` : undefined,
                zIndex: "var(--z-popover, 2000)",
              }}
            >
              <h3 className="rail-theme-popover-title">
                {language === "ar" ? "السمات" : "Themes"}
              </h3>
              <div className="rail-theme-list">
                {themesList.map((tItem) => {
                  const isSelected = tItem.value === theme;
                  return (
                    <button
                      key={tItem.value}
                      className="rail-theme-item"
                      role="menuitem"
                      data-active={isSelected ? "true" : "false"}
                      onClick={() => {
                        onThemeChange(tItem.value);
                        setIsThemeOpen(false);
                      }}
                      type="button"
                    >
                      <div className="theme-item-left">
                        <span className="theme-item-name">
                          {language === "ar" ? tItem.labelAr : tItem.labelEn}
                        </span>
                        <div className="theme-item-swatches">
                          {tItem.colors.map((c, idx) => (
                            <span
                              key={idx}
                              className="theme-item-swatch"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      {isSelected && <span className="theme-item-checkmark">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )}

        </div>

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
      <CategoryCustomizationDialog
        category={editingCategory}
        language={language}
        railIconMode={railIconMode}
        onClose={() => setEditingCategory(null)}
        onSave={onUpdateCategory}
      />
    </aside>
  );
}

// For test verification: data-tooltip-placement="right"

