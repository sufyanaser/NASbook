export interface AppCommand {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly category: "editor" | "app";
  readonly defaultShortcut: string;
}

export const APP_COMMANDS: readonly AppCommand[] = [
  { id: "saveNote", nameEn: "Save Note", nameAr: "حفظ الملاحظة", category: "app", defaultShortcut: "Ctrl+S" },
  { id: "newNote", nameEn: "New Note", nameAr: "ملاحظة جديدة", category: "app", defaultShortcut: "Ctrl+Alt+N" },
  { id: "renameNote", nameEn: "Rename Note", nameAr: "إعادة تسمية الملاحظة", category: "app", defaultShortcut: "Ctrl+R" },
  { id: "moveNote", nameEn: "Move Note to Category", nameAr: "نقل الملاحظة لفئة", category: "app", defaultShortcut: "Ctrl+M" },
  { id: "deleteNote", nameEn: "Delete Note to Trash", nameAr: "حذف الملاحظة لسلة المهملات", category: "app", defaultShortcut: "Ctrl+Shift+D" },
  { id: "toggleBold", nameEn: "Toggle Bold", nameAr: "تبديل النص العريض", category: "editor", defaultShortcut: "Ctrl+B" },
  { id: "toggleItalic", nameEn: "Toggle Italic", nameAr: "تبديل النص المائل", category: "editor", defaultShortcut: "Ctrl+I" },
  { id: "toggleUnderline", nameEn: "Toggle Underline", nameAr: "تبديل النص المسطر", category: "editor", defaultShortcut: "Ctrl+U" },
  { id: "toggleStrike", nameEn: "Toggle Strikethrough", nameAr: "تبديل نص يتوسطه خط", category: "editor", defaultShortcut: "Ctrl+Shift+S" },
  { id: "toggleCode", nameEn: "Toggle Inline Code", nameAr: "تبديل كود مضمن", category: "editor", defaultShortcut: "Ctrl+E" },
  { id: "toggleCodeBlock", nameEn: "Toggle Code Block", nameAr: "تبديل كتلة الكود", category: "editor", defaultShortcut: "Ctrl+Alt+C" },
  { id: "toggleBulletList", nameEn: "Toggle Bullet List", nameAr: "تبديل قائمة نقطية", category: "editor", defaultShortcut: "Ctrl+Shift+8" },
  { id: "toggleNumberedList", nameEn: "Toggle Numbered List", nameAr: "تبديل قائمة رقمية", category: "editor", defaultShortcut: "Ctrl+Shift+9" },
  { id: "toggleBlockquote", nameEn: "Toggle Blockquote", nameAr: "تبديل اقتباس", category: "editor", defaultShortcut: "Ctrl+Shift+Q" },
  { id: "clearFormatting", nameEn: "Clear Formatting", nameAr: "مسح التنسيق", category: "editor", defaultShortcut: "Ctrl+Alt+R" },
];
