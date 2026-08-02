import { useEffect, useRef } from "react";
import type { AppLanguage } from "../../shared/settings";
import type { OperationErrorState } from "../hooks/useOperationError";

interface OperationErrorDialogProps {
  readonly error: OperationErrorState | null;
  readonly language: AppLanguage;
  readonly onDismiss: () => void;
}

const OPERATION_LABELS: Record<string, { readonly ar: string; readonly en: string }> = {
  "open note": { ar: "فتح الملاحظة", en: "Open note" },
  "create note": { ar: "إنشاء ملاحظة", en: "Create note" },
  "change note lock": { ar: "تغيير قفل الملاحظة", en: "Change note lock" },
  "move note to trash": { ar: "نقل الملاحظة إلى السلة", en: "Move note to Trash" },
  "rename note": { ar: "إعادة تسمية الملاحظة", en: "Rename note" },
  "move note": { ar: "نقل الملاحظة", en: "Move note" },
  "import Markdown": { ar: "استيراد Markdown", en: "Import Markdown" },
  "import NASBK": { ar: "استيراد NASBK", en: "Import NASBK" },
  "export note": { ar: "تصدير الملاحظة", en: "Export note" },
  "export category": { ar: "تصدير التصنيف", en: "Export category" },
  "update settings": { ar: "تحديث الإعدادات", en: "Update settings" },
  "update category": { ar: "تحديث التصنيف", en: "Update category" },
  "open data folder": { ar: "فتح مجلد البيانات", en: "Open data folder" },
  "restore note": { ar: "استعادة الملاحظة", en: "Restore note" },
  "delete note permanently": { ar: "حذف الملاحظة نهائياً", en: "Delete note permanently" },
};

export function OperationErrorDialog({
  error,
  language,
  onDismiss,
}: OperationErrorDialogProps): JSX.Element | null {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!error) {
      return undefined;
    }
    buttonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [error, onDismiss]);

  if (!error) {
    return null;
  }

  const isArabic = language === "ar";
  const operationLabel = OPERATION_LABELS[error.operation];
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={isArabic ? "خطأ في العملية" : "Operation error"}
        aria-modal="true"
        className="modal-dialog"
        data-variant="destructive"
        role="alertdialog"
      >
        <div className="modal-dialog-copy">
          <h2>{isArabic ? "تعذّر إكمال العملية" : "Operation could not be completed"}</h2>
          <p>
            {isArabic ? "العملية: " : "Operation: "}
            {operationLabel ? (isArabic ? operationLabel.ar : operationLabel.en) : error.operation}
          </p>
          <p className="operation-error-detail">{error.detail}</p>
        </div>
        <div className="modal-dialog-actions">
          <button ref={buttonRef} className="modal-primary-button" onClick={onDismiss} type="button">
            {isArabic ? "حسناً" : "OK"}
          </button>
        </div>
      </section>
    </div>
  );
}
