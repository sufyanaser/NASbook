import type { AppLanguage } from "../../shared/settings";
import { t } from "../../shared/i18n";

interface StatusFooterProps {
  readonly databaseStatus: "ready" | "unavailable";
  readonly notesCount: number;
  readonly saveStatus: string;
  readonly language: AppLanguage;
  readonly editorDirection?: string;
  readonly isFocusMode?: boolean;
  readonly appName?: string;
  readonly appVersion?: string;
}

export function StatusFooter({
  databaseStatus,
  notesCount,
  saveStatus,
  language,
  editorDirection,
  isFocusMode,
  appName,
  appVersion,
}: StatusFooterProps): JSX.Element {
  const translatedSaveStatus = (() => {
    const s = saveStatus.toLowerCase();
    if (s === "saved" || s === "idle") return t("saved", language);
    if (s === "unsaved") return t("unsavedChanges", language);
    if (s === "saving") return t("saving", language);
    if (s === "error") return t("saveError", language);
    return saveStatus;
  })();

  return (
    <footer className="status-footer" data-focus-mode={isFocusMode ? "true" : "false"}>
      <div className="status-footer-left">
        <span className="status-item status-db" data-status={databaseStatus}>
          <span className="status-dot" />
          {databaseStatus === "ready" ? t("settingsDataReady", language) : t("settingsDataUnavailable", language)}
        </span>
        {!isFocusMode && (
          <span className="status-item">
            {t("notesListTitle", language)}: {notesCount}
          </span>
        )}
      </div>
      <div className="status-footer-right">
        <span className="status-item status-save" data-status={saveStatus.toLowerCase()}>
          {translatedSaveStatus}
        </span>
        <span className="status-item status-dir">
          {editorDirection ? editorDirection.toUpperCase() : "LTR"}
        </span>
        {appVersion && (
          <span className="status-item status-app-version">
            {appName ?? "NASbook"} {appVersion}
          </span>
        )}
      </div>
    </footer>
  );
}
