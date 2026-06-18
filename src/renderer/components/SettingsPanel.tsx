import { useEffect, useState } from "react";
import type { AppInfo } from "../../shared/ipc";
import {
  appThemes,
  editorDensities,
  editorDirections,
  editorFontSizes,
  railIconModes,
  type AppSettings,
} from "../../shared/settings";

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
  readonly label: string;
}[] = [
  { id: "appearance", label: "Appearance" },
  { id: "editor", label: "Editor" },
  { id: "notes", label: "Notes" },
  { id: "data", label: "Data" },
  { id: "about", label: "About" },
];

const labels: Record<string, string> = {
  dark: "Dark",
  light: "Light",
  graphite: "Graphite",
  "material-dark": "Material Dark",
  ulysses: "Ulysses",
  "one-dark": "One Dark",
  colored: "Colored",
  adaptive: "Adaptive",
  auto: "Auto",
  rtl: "RTL",
  ltr: "LTR",
  compact: "Compact",
  comfortable: "Comfortable",
  wide: "Wide",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

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
            <h2>Settings</h2>
          </div>
          <button
            aria-label="Close settings"
            className="settings-close-button"
            data-tooltip="Close settings"
            onClick={onClose}
            type="button"
          >
            Close
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
                {section.label}
              </button>
            ))}
          </nav>

          <section className="settings-content">
            {activeSection === "appearance" && (
              <>
                <div className="settings-section-heading">
                  <h3>Appearance</h3>
                  <p>Control the app surface and navigation rail presentation.</p>
                </div>
                <SettingRow
                  label="Theme"
                  description="Applies a theme token set to the workspace."
                >
                  <select
                    value={settings.theme}
                    onChange={(event) =>
                      onUpdateSettings({ theme: event.target.value as AppSettings["theme"] })
                    }
                  >
                    {appThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {labels[theme]}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label="Rail icons"
                  description="Colored icons are the stable default. Adaptive uses theme-aware SVG masks."
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
                        {labels[mode]}
                      </option>
                    ))}
                  </select>
                </SettingRow>
              </>
            )}

            {activeSection === "editor" && (
              <>
                <div className="settings-section-heading">
                  <h3>Editor</h3>
                  <p>Adjust writing direction, reading density, and metadata visibility.</p>
                </div>
                <SettingRow
                  label="Direction"
                  description="Auto supports mixed Arabic and English without forcing one direction."
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
                        {labels[direction]}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label="Density"
                  description="Changes editor page width and internal spacing."
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
                        {labels[density]}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label="Font size"
                  description="Adjusts editor content size only."
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
                        {labels[size]}
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow
                  label="Show metadata"
                  description="Show created and updated timestamps below the title."
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
                  label="Confirm unsaved switches"
                  description="Ask before switching notes or categories when a draft is dirty."
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
                  <h3>Notes</h3>
                  <p>Control how note cards summarize existing notes.</p>
                </div>
                <SettingRow
                  label="Show previews"
                  description="Display the short body preview in each note card."
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
                  label="Show dates"
                  description="Display updated dates in the notes list."
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
                  <h3>Data</h3>
                  <p>Local SQLite storage status and data folder access.</p>
                </div>
                <div className="settings-data-grid">
                  <span>Database status</span>
                  <strong>{appInfo ? "Ready" : "Unavailable"}</strong>
                  <span>Data folder</span>
                  <code>{appInfo?.dataDirectory ?? "Unavailable"}</code>
                  <span>Database file</span>
                  <code>{appInfo?.databasePath ?? "Unavailable"}</code>
                  <span>Settings file</span>
                  <code>{appInfo?.settingsPath ?? "Unavailable"}</code>
                </div>
                <button
                  className="settings-primary-button"
                  disabled={!appInfo}
                  onClick={onOpenDataFolder}
                  type="button"
                >
                  Open data folder
                </button>
              </>
            )}

            {activeSection === "about" && (
              <>
                <div className="settings-section-heading">
                  <h3>About</h3>
                  <p>Local-first personal notes for Arabic and English writing.</p>
                </div>
                <div className="settings-about-list">
                  <strong>NAS Notesbook</strong>
                  <span>Version {appInfo?.version ?? "0.1.0"}</span>
                  <span>Local-first SQLite notes app</span>
                  <span>Manual save: Ctrl+S</span>
                  <span>Rich text editor: Tiptap</span>
                </div>
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
