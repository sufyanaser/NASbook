import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { CategoryRecord } from "../../shared/categories";
import {
  categoryIconChoices,
  resolveCategoryIconKey,
  type CategoryIconKey,
} from "../../shared/categoryIcons";
import type { UpdateCategoryInput } from "../../shared/ipc";
import type { AppLanguage, RailIconMode } from "../../shared/settings";
import "../styles/category-customization.css";

interface CategoryCustomizationDialogProps {
  readonly category: CategoryRecord | null;
  readonly language: AppLanguage;
  readonly railIconMode: RailIconMode;
  readonly onClose: () => void;
  readonly onSave: (input: UpdateCategoryInput) => Promise<void>;
}

const iconAssetPath = (mode: RailIconMode, fileName: string): string =>
  `${import.meta.env.BASE_URL}category-icons/${mode}/${fileName}`;

export function CategoryCustomizationDialog({
  category,
  language,
  railIconMode,
  onClose,
  onSave,
}: CategoryCustomizationDialogProps): JSX.Element | null {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconKey>("folder");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category) {
      return;
    }

    setName(category.name);
    setIcon(resolveCategoryIconKey(category.icon, category.slug));
    setError("");
    setIsSaving(false);
  }, [category]);

  useEffect(() => {
    if (!category) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [category, isSaving, onClose]);

  if (!category) {
    return null;
  }

  const isArabic = language === "ar";

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError(isArabic ? "اكتب اسم المجلد." : "Enter a folder name.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSave({ id: category.id, name: normalizedName, icon });
      onClose();
    } catch (saveError) {
      console.error("Failed to update category:", saveError);
      setError(isArabic ? "تعذر حفظ التعديلات." : "Unable to save changes.");
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="category-customization-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        className="category-customization-dialog"
        dir={isArabic ? "rtl" : "ltr"}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="category-customization-header">
          <div>
            <h2>{isArabic ? "تخصيص المجلد" : "Customize folder"}</h2>
            <p>
              {isArabic
                ? "غيّر الاسم واختر أيقونة محفوظة داخل NASbook."
                : "Rename the folder and choose a built-in NASbook icon."}
            </p>
          </div>
          <button
            aria-label={isArabic ? "إغلاق" : "Close"}
            className="category-customization-close"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <label className="category-customization-field">
          <span>{isArabic ? "اسم المجلد" : "Folder name"}</span>
          <input
            autoFocus
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>

        <fieldset className="category-customization-icons">
          <legend>{isArabic ? "الأيقونة" : "Icon"}</legend>
          <div className="category-customization-icon-grid">
            {categoryIconChoices.map((choice) => {
              const selected = choice.key === icon;
              const src = iconAssetPath(railIconMode, choice.fileName);

              return (
                <button
                  aria-label={isArabic ? choice.labelAr : choice.labelEn}
                  className="category-customization-icon-button"
                  data-selected={selected ? "true" : "false"}
                  key={choice.key}
                  onClick={() => setIcon(choice.key)}
                  title={isArabic ? choice.labelAr : choice.labelEn}
                  type="button"
                >
                  {railIconMode === "colored" ? (
                    <img alt="" src={src} />
                  ) : (
                    <span
                      className="category-customization-icon-mask"
                      style={{
                        "--category-icon-url": `url(${src})`,
                      } as React.CSSProperties}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p className="category-customization-error" role="alert">
            {error}
          </p>
        )}

        <div className="category-customization-actions">
          <button
            className="category-customization-secondary"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            className="category-customization-primary"
            disabled={isSaving}
            type="submit"
          >
            {isSaving
              ? isArabic
                ? "جارٍ الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ"
                : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
