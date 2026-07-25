import type { CategorySlug } from "./categories";

export type CategoryIconKey =
  | "notes"
  | "folder"
  | "broadcast"
  | "home"
  | "person"
  | "code"
  | "warning"
  | "grid"
  | "star"
  | "bookmark"
  | "briefcase"
  | "calendar"
  | "microphone"
  | "radio"
  | "music"
  | "image"
  | "database"
  | "cloud"
  | "shield"
  | "rocket"
  | "target"
  | "palette"
  | "lightbulb"
  | "archive-box";

export interface CategoryIconChoice {
  readonly key: CategoryIconKey;
  readonly fileName: string;
  readonly labelAr: string;
  readonly labelEn: string;
}

export const categoryIconChoices: readonly CategoryIconChoice[] = [
  { key: "notes", fileName: "all-notes.svg", labelAr: "ملاحظات", labelEn: "Notes" },
  { key: "folder", fileName: "projects.svg", labelAr: "مجلد", labelEn: "Folder" },
  { key: "broadcast", fileName: "channels.svg", labelAr: "قناة", labelEn: "Channel" },
  { key: "home", fileName: "nas.svg", labelAr: "رئيسي", labelEn: "Home" },
  { key: "person", fileName: "personal.svg", labelAr: "شخصي", labelEn: "Personal" },
  { key: "code", fileName: "development.svg", labelAr: "تطوير", labelEn: "Development" },
  { key: "warning", fileName: "errors.svg", labelAr: "تنبيه", labelEn: "Warning" },
  { key: "grid", fileName: "templates.svg", labelAr: "قوالب", labelEn: "Templates" },
  { key: "star", fileName: "star.svg", labelAr: "نجمة", labelEn: "Star" },
  { key: "bookmark", fileName: "bookmark.svg", labelAr: "علامة", labelEn: "Bookmark" },
  { key: "briefcase", fileName: "briefcase.svg", labelAr: "أعمال", labelEn: "Briefcase" },
  { key: "calendar", fileName: "calendar.svg", labelAr: "تقويم", labelEn: "Calendar" },
  { key: "microphone", fileName: "microphone.svg", labelAr: "مايكروفون", labelEn: "Microphone" },
  { key: "radio", fileName: "radio.svg", labelAr: "إذاعة", labelEn: "Radio" },
  { key: "music", fileName: "music.svg", labelAr: "موسيقى", labelEn: "Music" },
  { key: "image", fileName: "image.svg", labelAr: "صور", labelEn: "Images" },
  { key: "database", fileName: "database.svg", labelAr: "بيانات", labelEn: "Database" },
  { key: "cloud", fileName: "cloud.svg", labelAr: "سحابة", labelEn: "Cloud" },
  { key: "shield", fileName: "shield.svg", labelAr: "حماية", labelEn: "Shield" },
  { key: "rocket", fileName: "rocket.svg", labelAr: "انطلاق", labelEn: "Rocket" },
  { key: "target", fileName: "target.svg", labelAr: "هدف", labelEn: "Target" },
  { key: "palette", fileName: "palette.svg", labelAr: "تصميم", labelEn: "Palette" },
  { key: "lightbulb", fileName: "lightbulb.svg", labelAr: "فكرة", labelEn: "Idea" },
  { key: "archive-box", fileName: "archive-box.svg", labelAr: "صندوق", labelEn: "Archive box" },
] as const;

export const customizableCategorySlugs = [
  "prompts",
  "chatgpt-instructions",
  "nas-projects",
  "powershell-commands",
  "development-notes",
  "errors-fixes",
  "templates",
] as const satisfies readonly CategorySlug[];

const fileByIconKey = Object.fromEntries(
  categoryIconChoices.map((choice) => [choice.key, choice.fileName]),
) as Record<CategoryIconKey, string>;

const legacyIconFiles: Readonly<Record<string, string>> = {
  "notebook-tabs": "all-notes.svg",
  "message-square-code": "projects.svg",
  "shield-alert": "channels.svg",
  "folder-git-2": "nas.svg",
  terminal: "personal.svg",
  "code-2": "development.svg",
  bug: "errors.svg",
  "layout-template": "templates.svg",
  archive: "archive.svg",
  "trash-2": "trash.svg",
};

const fallbackIconFiles: Readonly<Partial<Record<CategorySlug, string>>> = {
  "all-notes": "all-notes.svg",
  prompts: "projects.svg",
  "chatgpt-instructions": "channels.svg",
  "nas-projects": "nas.svg",
  "powershell-commands": "personal.svg",
  "development-notes": "development.svg",
  "errors-fixes": "errors.svg",
  templates: "templates.svg",
  archive: "archive.svg",
  trash: "trash.svg",
};

const defaultKeyBySlug: Readonly<Partial<Record<CategorySlug, CategoryIconKey>>> = {
  prompts: "folder",
  "chatgpt-instructions": "broadcast",
  "nas-projects": "home",
  "powershell-commands": "person",
  "development-notes": "code",
  "errors-fixes": "warning",
  templates: "grid",
};

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return Object.prototype.hasOwnProperty.call(fileByIconKey, value);
}

export function resolveCategoryIconFile(
  icon: string | undefined,
  slug: CategorySlug,
): string {
  if (icon && isCategoryIconKey(icon)) {
    return fileByIconKey[icon];
  }

  if (icon && legacyIconFiles[icon]) {
    return legacyIconFiles[icon];
  }

  return fallbackIconFiles[slug] ?? "projects.svg";
}

export function resolveCategoryIconKey(
  icon: string | undefined,
  slug: CategorySlug,
): CategoryIconKey {
  if (icon && isCategoryIconKey(icon)) {
    return icon;
  }

  return defaultKeyBySlug[slug] ?? "folder";
}
