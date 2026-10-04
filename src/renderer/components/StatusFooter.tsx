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
  const isArabic = language === "ar";
  const translatedSaveStatus = (() => {
    const s = saveStatus.toLowerCase();
    if (s === "saved" || s === "idle") return isArabic ? "حفظ تلقائي" : "Autosaved";
    if (s === "unsaved") return t("unsavedChanges", language);
    if (s === "saving") return t("saving", language);
    if (s === "error") return t("saveError", language);
    return saveStatus;
  })();

  const directionDisplay = (() => {
    const dir = (editorDirection || "auto").toLowerCase();
    if (dir === "auto") return isArabic ? "اتجاه تلقائي" : "Auto Direction";
    if (dir === "rtl") return isArabic ? "يمين ← يسار" : "RTL";
    return isArabic ? "يسار → يمين" : "LTR";
  })();

  const dbTooltip =
    databaseStatus === "ready"
      ? (isArabic ? "قاعدة البيانات متصلة وجاهزة" : "Database connected and ready")
      : (isArabic ? "قاعدة البيانات غير متاحة" : "Database unavailable");

  return (
    <footer className="status-footer" data-focus-mode={isFocusMode ? "true" : "false"}>
      <div className="status-footer-left">
        <span
          className="status-item status-db"
          data-status={databaseStatus}
          title={dbTooltip}
        >
          <span className="status-dot" />
          {databaseStatus === "ready" ? (isArabic ? "متصل" : "Connected") : (isArabic ? "غير متصل" : "Offline")}
        </span>
        {!isFocusMode && (
          <span className="status-item">
            {t("notesListTitle", language)}: {notesCount}
          </span>
        )}
      </div>
      <div className="status-footer-right">
        <span
          className="status-item status-save"
          data-status={saveStatus.toLowerCase()}
          title={isArabic ? "حالة الحفظ في الوقت الفعلي" : "Real-time save status"}
        >
          {translatedSaveStatus}
        </span>
        <span
          className="status-item status-dir"
          title={isArabic ? "اتجاه النص في المحرر" : "Editor text direction"}
        >
          {directionDisplay}
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
