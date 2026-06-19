import { useEffect, useState } from "react";
import type { AppInfo } from "../../shared/ipc";
import {
  appThemes,
  editorDensities,
  editorDirections,
  editorFontSizes,
  railIconModes,
  type AppSettings,
  type AppLanguage,
} from "../../shared/settings";
import { t } from "../../shared/i18n";

type SettingsSection = "appearance" | "editor" | "notes" | "data" | "about";

interface SettingsPanelProps {
  readonly appInfo: AppInfo | null;
  readonly isOpen: boolean;
  readonly settings: AppSettings;
  readonly onClose: () => void;
  readonly onOpenDataFolder: () => void;
  readonly onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const sections: readonly {
  readonly id: SettingsSection;
}[] = [
  { id: "appearance" },
  { id: "editor" },
  { id: "notes" },
  { id: "data" },
  { id: "about" },
];

function getSectionTabLabel(id: SettingsSection, lang: AppLanguage): string {
  switch (id) {
    case "appearance":
      return t("settingsAppearanceTab", lang);
    case "editor":
      return t("settingsEditorTab", lang);
    case "notes":
      return t("settingsNotesTab", lang);
    case "data":
      return t("settingsDataTab", lang);
    case "about":
      return t("settingsAboutTab", lang);
    default:
      return id;
  }
}

function getLabel(key: string, lang: AppLanguage): string {
  if (lang === "ar") {
    switch (key) {
      case "dark": return "داكن";
      case "light": return "فاتح";
      case "graphite": return "غرافيت";
      case "material-dark": return "ماتيريال داكن";
      case "ulysses": return "يوليسيس";
      case "one-dark": return "ون دارك";
      case "colored": return "ملون";
      case "adaptive": return "متكيف";
      case "auto": return "تلقائي";
      case "rtl": return "RTL";
      case "ltr": return "LTR";
      case "compact": return "مدمج";
      case "comfortable": return "مريح";
      case "wide": return "عريض";
      case "small": return "صغير";
      case "medium": return "متوسط";
      case "large": return "كبير";
      default: return key;
    }
  }
  // English defaults
  switch (key) {
    case "dark": return "Dark";
    case "light": return "Light";
    case "graphite": return "Graphite";
    case "material-dark": return "Material Dark";
    case "ulysses": return "Ulysses";
    case "one-dark": return "One Dark";
    case "colored": return "Colored";
    case "adaptive": return "Adaptive";
    case "auto": return "Auto";
    case "rtl": return "RTL";
    case "ltr": return "LTR";
    case "compact": return "Compact";
    case "comfortable": return "Comfortable";
    case "wide": return "Wide";
    case "small": return "Small";
    case "medium": return "Medium";
    case "large": return "Large";
    default: return key;
  }
}

function SettingRow({
  children,
  description,
  label,
}: {
  readonly children: JSX.Element;
  readonly description: string;
  readonly label: string;
}): JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <span>{label}</span>
        <p>{description}</p>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

export function SettingsPanel({
  appInfo,
  isOpen,
  settings,
  onClose,
  onOpenDataFolder,
  onUpdateSettings,
}: SettingsPanelProps): JSX.Element | null {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("appearance");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const lang = settings.language;

  return (
    <div
      className="settings-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        aria-label="Settings"
        aria-modal="true"
        className="settings-panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settings-panel-header">
          <div>
            <span>NAS Notesbook</span>
            <h2>{t("settingsTitle", lang)}</h2>
          </div>
          <button
            aria-label={t("settingsClose", lang)}
            className="settings-close-button"
            data-tooltip={t("settingsClose", lang)}
            onClick={onClose}
            type="button"
          >
            {t("settingsClose", lang)}
          </button>
        </header>

        <div className="settings-panel-body">
          <nav className="settings-tabs" aria-label="Settings sections">
            {sections.map((section) => (
              <button
                className="settings-tab"
                data-active={activeSection === section.id}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {getSectionTabLabel(section.id, lang)}
              </button>
            ))}
          </nav>

          <section className="settings-content">
            {activeSection === "appearance" && (
              <>
                <div className="settings-section-heading">
                  <h3>{t("settingsAppearanceHeader", lang)}</h3>
                  <p>{t("settingsAppearanceSub", lang)}</p>
                </div>
                <SettingRow
                  label={t("settingsRowTheme", lang)}
                  description={t("settingsRowThemeDesc", lang)}
                >
                  <select
                    value={settings.theme}
                    onChange={(event) =>
                      onUpdateSettings({ theme: event.target.value as AppSettings["theme"] })
                    }
                  >
                    {appThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {getLabel(theme, lang)}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label={t("settingsRowLanguage", lang)}
                  description={t("settingsRowLanguageDesc", lang)}
                >
                  <select
                    value={settings.language}
                    onChange={(event) =>
                      onUpdateSettings({
                        language: event.target.value as AppSettings["language"],
                      })
                    }
                  >
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </SettingRow>
                <SettingRow
                  label={t("settingsRowRailIcons", lang)}
                  description={t("settingsRowRailIconsDesc", lang)}
                >
                  <select
                    value={settings.railIconMode}
                    onChange={(event) =>
                      onUpdateSettings({
                        railIconMode: event.target.value as AppSettings["railIconMode"],
                      })
                    }
                  >
                    {railIconModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {getLabel(mode, lang)}
                      </option>
                    ))}
                  </select>
                </SettingRow>
              </>
            )}

            {activeSection === "editor" && (
              <>
                <div className="settings-section-heading">
                  <h3>{t("settingsEditorHeader", lang)}</h3>
                  <p>{t("settingsEditorSub", lang)}</p>
                </div>
                <SettingRow
                  label={t("settingsRowDirection", lang)}
                  description={t("settingsRowDirectionDesc", lang)}
                >
                  <select
                    value={settings.editorDirection}
                    onChange={(event) =>
                      onUpdateSettings({
                        editorDirection: event.target.value as AppSettings["editorDirection"],
                      })
                    }
                  >
                    {editorDirections.map((direction) => (
                      <option key={direction} value={direction}>
                        {getLabel(direction, lang)}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label={t("settingsRowDensity", lang)}
                  description={t("settingsRowDensityDesc", lang)}
                >
                  <select
                    value={settings.editorDensity}
                    onChange={(event) =>
                      onUpdateSettings({
                        editorDensity: event.target.value as AppSettings["editorDensity"],
                      })
                    }
                  >
                    {editorDensities.map((density) => (
                      <option key={density} value={density}>
                        {getLabel(density, lang)}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label={t("settingsRowFontSize", lang)}
                  description={t("settingsRowFontSizeDesc", lang)}
                >
                  <select
                    value={settings.fontSize}
                    onChange={(event) =>
                      onUpdateSettings({
                        fontSize: event.target.value as AppSettings["fontSize"],
                      })
                    }
                  >
                    {editorFontSizes.map((size) => (
                      <option key={size} value={size}>
                        {getLabel(size, lang)}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label={t("settingsRowShowMetadata", lang)}
                  description={t("settingsRowShowMetadataDesc", lang)}
                >
                  <input
                    checked={settings.showMetadata}
                    onChange={(event) =>
                      onUpdateSettings({ showMetadata: event.target.checked })
                    }
                    type="checkbox"
                  />
                </SettingRow>
                <SettingRow
                  label={t("settingsRowConfirmUnsaved", lang)}
                  description={t("settingsRowConfirmUnsavedDesc", lang)}
                >
                  <input
                    checked={settings.confirmUnsavedSwitch}
                    onChange={(event) =>
                      onUpdateSettings({
                        confirmUnsavedSwitch: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </SettingRow>
              </>
            )}

            {activeSection === "notes" && (
              <>
                <div className="settings-section-heading">
                  <h3>{t("settingsNotesHeader", lang)}</h3>
                  <p>{t("settingsNotesSub", lang)}</p>
                </div>
                <SettingRow
                  label={t("settingsRowShowPreviews", lang)}
                  description={t("settingsRowShowPreviewsDesc", lang)}
                >
                  <input
                    checked={settings.showNotePreview}
                    onChange={(event) =>
                      onUpdateSettings({
                        showNotePreview: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </SettingRow>
                <SettingRow
                  label={t("settingsRowShowDates", lang)}
                  description={t("settingsRowShowDatesDesc", lang)}
                >
                  <input
                    checked={settings.showNoteDates}
                    onChange={(event) =>
                      onUpdateSettings({ showNoteDates: event.target.checked })
                    }
                    type="checkbox"
                  />
                </SettingRow>
              </>
            )}

            {activeSection === "data" && (
              <>
                <div className="settings-section-heading">
                  <h3>{t("settingsDataHeader", lang)}</h3>
                  <p>{t("settingsDataSub", lang)}</p>
                </div>
                <div className="settings-data-grid">
                  <span>{t("settingsDataDbStatus", lang)}</span>
                  <strong>{appInfo ? t("settingsDataReady", lang) : t("settingsDataUnavailable", lang)}</strong>
                  <span>{t("settingsDataFolder", lang)}</span>
                  <code>{appInfo?.dataDirectory ?? t("settingsDataUnavailable", lang)}</code>
                  <span>{t("settingsDataDbFile", lang)}</span>
                  <code>{appInfo?.databasePath ?? t("settingsDataUnavailable", lang)}</code>
                  <span>{t("settingsDataSettingsFile", lang)}</span>
                  <code>{appInfo?.settingsPath ?? t("settingsDataUnavailable", lang)}</code>
                </div>
                <button
                  className="settings-primary-button"
                  disabled={!appInfo}
                  onClick={onOpenDataFolder}
                  type="button"
                >
                  {t("settingsDataBtnOpen", lang)}
                </button>
              </>
            )}

            {activeSection === "about" && (
              <>
                <div className="settings-section-heading">
                  <h3>{t("settingsAboutHeader", lang)}</h3>
                  <p>{t("settingsAboutSub", lang)}</p>
                </div>
                <div className="settings-about-list">
                  <strong>NAS Notesbook</strong>
                  <span>{t("settingsAboutVersion", lang)} {appInfo?.version ?? "0.1.0"}</span>
                  <span>{t("settingsAboutSQLite", lang)}</span>
                  <span>{t("settingsAboutSaveShort", lang)}</span>
                  <span>{t("settingsAboutTiptap", lang)}</span>
                </div>
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
