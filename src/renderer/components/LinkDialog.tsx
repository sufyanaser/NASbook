import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../../shared/settings";
import { t } from "../../shared/i18n";

interface LinkDialogProps {
  readonly isOpen: boolean;
  readonly initialUrl: string;
  readonly language: AppLanguage;
  readonly onCancel: () => void;
  readonly onConfirm: (url: string) => void;
  readonly onRemove?: () => void;
}

export function LinkDialog({
  isOpen,
  initialUrl,
  language,
  onCancel,
  onConfirm,
  onRemove,
}: LinkDialogProps): JSX.Element | null {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state with prop updates
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      // Autofocus the input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialUrl]);

  // Handle global key events (Escape to close, Enter to submit)
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

  const handleSubmit = (event?: React.FormEvent): void => {
    if (event) {
      event.preventDefault();
    }
    
    const trimmed = url.trim();
    if (!trimmed) {
      onCancel();
      return;
    }

    // Format URL: if it doesn't start with http:// or https://, prepend https://
    let formattedUrl = trimmed;
    if (!/^https?:\/\//i.test(trimmed)) {
      formattedUrl = `https://${trimmed}`;
    }

    onConfirm(formattedUrl);
  };

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
        aria-label="Add/Edit Link"
        aria-modal="true"
        className="modal-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <form onSubmit={handleSubmit} className="modal-dialog-copy">
          <h2>{initialUrl ? t("linkDialogEditTitle", language) : t("linkDialogAddTitle", language)}</h2>
          <p style={{ marginBottom: "12px" }}>{t("linkDialogUrlLabel", language)}</p>
          
          <input
            ref={inputRef}
            className="link-dialog-input"
            type="text"
            placeholder={t("linkDialogUrlPlaceholder", language)}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              width: "100%",
              height: "36px",
              padding: "0 10px",
              borderRadius: "6px",
              border: "1px solid var(--app-border-strong)",
              background: "var(--app-surface-muted)",
              color: "var(--app-text-strong)",
              fontSize: "13px",
              outline: "none",
              marginTop: "8px",
            }}
          />

          <div className="modal-dialog-actions" style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "20px" }}>
            <div>
              {onRemove && initialUrl && (
                <button
                  className="modal-secondary-button"
                  onClick={onRemove}
                  type="button"
                  style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                >
                  {t("linkDialogRemove", language)}
                </button>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="modal-secondary-button"
                onClick={onCancel}
                type="button"
              >
                {t("linkDialogCancel", language)}
              </button>
              <button
                className="modal-primary-button"
                type="submit"
                disabled={!url.trim()}
              >
                {t("linkDialogApply", language)}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
