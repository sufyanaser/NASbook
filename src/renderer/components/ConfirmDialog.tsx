import { useEffect } from "react";

interface ConfirmDialogProps {
  readonly cancelLabel?: string;
  readonly confirmLabel: string;
  readonly isOpen: boolean;
  readonly message: string;
  readonly title: string;
  readonly variant?: "default" | "destructive";
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  isOpen,
  message,
  title,
  variant = "default",
  onCancel,
  onConfirm,
}: ConfirmDialogProps): JSX.Element | null {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className="modal-dialog"
        data-variant={variant}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-dialog-copy">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="modal-dialog-actions">
          <button
            className="modal-secondary-button"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="modal-primary-button"
            data-variant={variant}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
