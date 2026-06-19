import type { AppLanguage } from "../../shared/settings";
import { t } from "../../shared/i18n";

interface StatusFooterProps {
  readonly activeCategoryName: string;
  readonly categoriesCount: number;
  readonly databaseStatus: "ready" | "unavailable";
  readonly notesCount: number;
  readonly saveStatus: string;
  readonly language: AppLanguage;
}

export function StatusFooter({
  activeCategoryName,
  categoriesCount,
  databaseStatus,
  notesCount,
  saveStatus,
  language,
}: StatusFooterProps): JSX.Element {
  const databaseLabel =
    databaseStatus === "ready"
      ? t("footerDbReady", language)
      : t("footerDbUnavailable", language);

  const translatedSaveStatus = (() => {
    const s = saveStatus.toLowerCase();
    if (s === "saved" || s === "idle") return t("saved", language);
    if (s === "unsaved") return t("unsavedChanges", language);
    if (s === "saving") return t("saving", language);
    if (s === "error") return t("saveError", language);
    return saveStatus;
  })();

  return (
    <footer className="status-footer">
      <span>{t("footerPhaseScaffold", language)}</span>
      <span>
        {t("footerCategory", language)} {activeCategoryName}
      </span>
      <span>{databaseLabel}</span>
      <span>
        {t("footerCategoriesCount", language)} {categoriesCount}
      </span>
      <span>
        {t("footerNotesCount", language)} {notesCount}
      </span>
      <span>
        {t("footerSave", language)} {translatedSaveStatus}
      </span>
      <span>{t("footerDir", language)}</span>
    </footer>
  );
}
