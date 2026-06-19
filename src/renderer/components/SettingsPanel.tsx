import { useEffect, useState } from "react";
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
import type { AppInfo, BackupStatus, CloudBackupInfo } from "../../shared/ipc";

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

  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isBackupActionRunning, setIsBackupActionRunning] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [cloudStatus, setCloudStatus] = useState<CloudBackupInfo | null>(null);
  const [isCloudActionRunning, setIsCloudActionRunning] = useState(false);
  const [cloudFeedback, setCloudFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchCloudStatus = async () => {
    if (!window.nasNotesbook) return;
    try {
      const status = await window.nasNotesbook.cloudBackup.getStatus();
      setCloudStatus(status);
    } catch (err) {
      console.error("Failed to get cloud backup status:", err);
    }
  };

  useEffect(() => {
    setFeedback(null);
    setCloudFeedback(null);
  }, [activeSection]);

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

  useEffect(() => {
    if (isOpen && activeSection === "data" && window.nasNotesbook) {
      window.nasNotesbook.backup.getStatus()
        .then(setBackupStatus)
        .catch((err) => {
          console.error("Failed to get backup status:", err);
          setBackupError(err.message || String(err));
        });
      fetchCloudStatus();
    }
  }, [isOpen, activeSection]);

  const handleCreateBackup = async () => {
    if (!window.nasNotesbook || isBackupActionRunning) return;
    setIsBackupActionRunning(true);
    setBackupError(null);
    setFeedback(null);
    try {
      const result = await window.nasNotesbook.backup.create();
      if (result.success) {
        const status = await window.nasNotesbook.backup.getStatus();
        setBackupStatus(status);
        setFeedback({
          type: "success",
          message: t("settingsDataBackupSuccess", lang),
        });
      } else {
        const errMsg = result.error || "Backup failed";
        setBackupError(errMsg);
        setFeedback({
          type: "error",
          message: `${t("settingsDataBackupFailed", lang)}: ${errMsg}`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setBackupError(errMsg);
      setFeedback({
        type: "error",
        message: `${t("settingsDataBackupFailed", lang)}: ${errMsg}`,
      });
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const handleOpenBackupsFolder = async () => {
    if (!window.nasNotesbook) return;
    try {
      await window.nasNotesbook.backup.openFolder();
    } catch (err: unknown) {
      console.error("Failed to open backups folder:", err);
    }
  };

  const handleLinkGoogle = async () => {
    if (!window.nasNotesbook || isCloudActionRunning) return;
    setIsCloudActionRunning(true);
    setCloudFeedback(null);
    try {
      const res = await window.nasNotesbook.googleAuth.link();
      await fetchCloudStatus();
      if (res.error) {
        setCloudFeedback({
          type: "error",
          message: res.message || res.error,
        });
      } else {
        setCloudFeedback({
          type: "success",
          message: t("googleStatusLinked", lang),
        });
      }
    } catch (err: unknown) {
      setCloudFeedback({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsCloudActionRunning(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!window.nasNotesbook || isCloudActionRunning) return;
    setIsCloudActionRunning(true);
    setCloudFeedback(null);
    try {
      await window.nasNotesbook.googleAuth.unlink();
      await fetchCloudStatus();
      setCloudFeedback({
        type: "success",
        message: t("googleAccountUnlinked", lang),
      });
    } catch (err: unknown) {
      setCloudFeedback({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsCloudActionRunning(false);
    }
  };

  const handleUploadLatest = async () => {
    if (!window.nasNotesbook || isCloudActionRunning) return;
    setIsCloudActionRunning(true);
    setCloudFeedback(null);
    try {
      if (!backupStatus || backupStatus.backupCount === 0) {
        setCloudFeedback({
          type: "error",
          message: t("googleNoLocalBackup", lang),
        });
        return;
      }
      
      const res = await window.nasNotesbook.cloudBackup.uploadLatest();
      await fetchCloudStatus();
      
      if (res.ok) {
        setCloudFeedback({
          type: "success",
          message: `${t("googleUploadSuccess", lang)} (Folder: ${res.folderName})`,
        });
      } else {
        const errMsg = res.error || "Upload failed";
        setCloudFeedback({
          type: "error",
          message: `${t("googleUploadFailed", lang)}: ${errMsg}`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setCloudFeedback({
        type: "error",
        message: `${t("googleUploadFailed", lang)}: ${errMsg}`,
      });
    } finally {
      setIsCloudActionRunning(false);
    }
  };

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

                <div className="settings-section-heading" style={{ marginTop: "28px" }}>
                  <h3>{t("settingsDataBackupHeader", lang)}</h3>
                  <p>{t("settingsDataBackupSub", lang)}</p>
                </div>

                <SettingRow
                  label={t("settingsDataBackupAutoToggle", lang)}
                  description={t("settingsDataBackupAutoToggleDesc", lang)}
                >
                  <input
                    checked={settings.autoBackupEnabled}
                    onChange={(event) =>
                      onUpdateSettings({ autoBackupEnabled: event.target.checked })
                    }
                    type="checkbox"
                  />
                </SettingRow>

                <SettingRow
                  label={t("settingsDataBackupRetention", lang)}
                  description={t("settingsDataBackupRetentionDesc", lang)}
                >
                  <select
                    value={settings.backupRetentionCount}
                    onChange={(event) =>
                      onUpdateSettings({
                        backupRetentionCount: Number(event.target.value),
                      })
                    }
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </SettingRow>

                <div className="settings-data-grid">
                  <span>{t("settingsDataBackupStatus", lang)}</span>
                  <strong>
                    {backupError ? (
                      <span style={{ color: "var(--app-error, #ff4d4f)" }}>
                        {t("settingsDataBackupFailed", lang)}: {backupError}
                      </span>
                    ) : backupStatus?.lastError ? (
                      <span style={{ color: "var(--app-error, #ff4d4f)" }}>
                        {t("settingsDataBackupFailed", lang)}: {backupStatus.lastError}
                      </span>
                    ) : (
                      t("settingsDataReady", lang)
                    )}
                  </strong>

                  <span>{t("settingsDataBackupFolder", lang)}</span>
                  <code>{backupStatus?.backupsFolder ?? t("settingsDataUnavailable", lang)}</code>

                  <span>{t("settingsDataBackupLastTime", lang)}</span>
                  <strong>
                    {backupStatus?.lastBackupAt
                      ? new Date(backupStatus.lastBackupAt).toLocaleString(
                          lang === "ar" ? "ar" : "en",
                          { dateStyle: "medium", timeStyle: "short" }
                        )
                      : t("settingsDataBackupNoBackups", lang)}
                  </strong>

                  <span>{t("settingsDataBackupCount", lang)}</span>
                  <strong>{backupStatus ? backupStatus.backupCount : 0}</strong>
                </div>

                {feedback && (
                  <div
                    className={`backup-feedback-banner ${feedback.type}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      marginTop: "16px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: feedback.type === "success"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      color: feedback.type === "success"
                        ? "rgb(16, 185, 129)"
                        : "rgb(239, 68, 68)",
                      border: `1px solid ${
                        feedback.type === "success"
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(239, 68, 68, 0.3)"
                      }`,
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                      {feedback.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <span>{feedback.message}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  <button
                    className="settings-primary-button"
                    disabled={isBackupActionRunning}
                    data-tooltip={t("tooltipCreateBackup", lang)}
                    onClick={handleCreateBackup}
                    type="button"
                  >
                    {isBackupActionRunning ? t("saving", lang) : t("settingsDataBackupBtnCreate", lang)}
                  </button>
                  <button
                    className="settings-primary-button"
                    disabled={!backupStatus}
                    data-tooltip={t("tooltipOpenBackupsFolder", lang)}
                    onClick={handleOpenBackupsFolder}
                    type="button"
                  >
                    {t("settingsDataBackupBtnOpen", lang)}
                  </button>
                </div>

                <div className="settings-section-heading" style={{ marginTop: "28px" }}>
                  <h3>{t("googleBackupHeader", lang)}</h3>
                  <p>{lang === "ar" ? "إدارة النسخ الاحتياطي السحابي لبياناتك وإعداداتك." : "Manage cloud backup for your data and settings."}</p>
                </div>

                <div className="settings-data-grid" style={{ gridTemplateColumns: "180px minmax(0, 1fr)" }}>
                  <span>{t("settingsDataBackupStatus", lang)}</span>
                  <strong>
                    {cloudStatus ? (
                      cloudStatus.status === "token_storage_unavailable" ? (
                        <span style={{ color: "var(--app-error, #ff4d4f)" }}>
                          {t("googleStatusStorageUnavailable", lang)}
                        </span>
                      ) : cloudStatus.status === "not_configured" ? (
                        <span style={{ color: "var(--app-warning, #faad14)" }}>
                          {t("googleStatusNotConfigured", lang)}
                        </span>
                      ) : cloudStatus.status === "not_linked" ? (
                        t("googleStatusNotLinked", lang)
                      ) : cloudStatus.status === "uploading" ? (
                        t("googleUploading", lang)
                      ) : cloudStatus.status === "success" ? (
                        <span style={{ color: "rgb(16, 185, 129)" }}>
                          {t("googleUploadSuccess", lang)}
                        </span>
                      ) : cloudStatus.status === "error" ? (
                        <span style={{ color: "var(--app-error, #ff4d4f)" }}>
                          {t("googleUploadFailed", lang)}
                        </span>
                      ) : (
                        t("googleStatusReady", lang)
                      )
                    ) : (
                      t("settingsDataUnavailable", lang)
                    )}
                  </strong>

                  <span>{t("googleLatestLocalBackup", lang)}</span>
                  <strong>
                    {backupStatus?.lastBackupFileName ? (
                      <code>{backupStatus.lastBackupFileName}</code>
                    ) : (
                      t("googleNoLocalBackup", lang)
                    )}
                  </strong>

                  <span>{t("googleLastBackup", lang)}</span>
                  <strong>
                    {cloudStatus?.lastCloudBackupAt
                      ? new Date(cloudStatus.lastCloudBackupAt).toLocaleString(
                          lang === "ar" ? "ar" : "en",
                          { dateStyle: "medium", timeStyle: "short" }
                        ) + (cloudStatus.lastCloudBackupFileName ? ` (${cloudStatus.lastCloudBackupFileName})` : "")
                      : t("settingsDataBackupNoBackups", lang)}
                  </strong>
                </div>

                {!cloudStatus?.configured && (
                  <p style={{ color: "var(--app-warning, #faad14)", fontSize: "12px", marginTop: "-8px", marginBottom: "16px" }}>
                    ⚠️ {t("googleCredentialsMissingHint", lang)}
                  </p>
                )}

                {cloudStatus?.configured && !cloudStatus?.linked && (
                  <p style={{ color: "var(--app-warning, #faad14)", fontSize: "12px", marginTop: "-8px", marginBottom: "16px" }}>
                    ⚠️ {t("googleLinkFirstHint", lang)}
                  </p>
                )}

                {cloudFeedback && (
                  <div
                    className={`backup-feedback-banner ${cloudFeedback.type}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      marginTop: "16px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: cloudFeedback.type === "success"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      color: cloudFeedback.type === "success"
                        ? "rgb(16, 185, 129)"
                        : "rgb(239, 68, 68)",
                      border: `1px solid ${
                        cloudFeedback.type === "success"
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(239, 68, 68, 0.3)"
                      }`,
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                      {cloudFeedback.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <span>{cloudFeedback.message}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  {!cloudStatus?.configured ? (
                    <button
                      className="settings-primary-button"
                      disabled={true}
                      type="button"
                    >
                      {t("googleBtnLink", lang)}
                    </button>
                  ) : cloudStatus?.status === "token_storage_unavailable" ? (
                    null
                  ) : (
                    <button
                      className="settings-primary-button"
                      disabled={isCloudActionRunning}
                      onClick={cloudStatus.linked ? handleUnlinkGoogle : handleLinkGoogle}
                      type="button"
                    >
                      {isCloudActionRunning
                        ? t("saving", lang)
                        : cloudStatus.linked
                        ? t("googleBtnUnlink", lang)
                        : t("googleBtnLink", lang)}
                    </button>
                  )}

                  <button
                    className="settings-primary-button"
                    disabled={
                      isCloudActionRunning ||
                      !cloudStatus?.configured ||
                      !cloudStatus?.linked ||
                      !backupStatus ||
                      backupStatus.backupCount === 0 ||
                      cloudStatus?.status === "token_storage_unavailable"
                    }
                    onClick={handleUploadLatest}
                    type="button"
                  >
                    {isCloudActionRunning && cloudStatus?.status === "uploading"
                      ? t("googleUploading", lang)
                      : t("googleBtnUpload", lang)}
                  </button>
                </div>
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
