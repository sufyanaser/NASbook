import type { AppLanguage } from "./settings";
import type { CategorySlug } from "./categories";

export type TranslationKeys =
  | "appTitle"
  // Navigation
  | "allNotes"
  | "projects"
  | "channels"
  | "nas"
  | "personal"
  | "development"
  | "errors"
  | "templates"
  | "archive"
  | "trash"
  // Notes List Sidebar
  | "notesListTitle"
  | "newNote"
  | "cannotCreateInTrash"
  | "currentCategory"
  | "trashIsEmpty"
  | "noNotesYet"
  | "pressPlusToCreate"
  | "noContentYet"
  | "updatedAtShort"
  // Save States
  | "saved"
  | "unsavedChanges"
  | "saving"
  | "saveError"
  | "saveFailedDialogTitle"
  | "saveFailedDialogBody"
  | "saveFailedDialogConfirm"
  | "saveFailedDialogCancel"
  // Editor
  | "createdAt"
  | "updatedAt"
  | "trashBanner"
  | "noteTitlePlaceholder"
  | "editorPlaceholder"
  | "editorPlaceholderSubtitle"
  // Toolbar Dropdown & Button Tooltips
  | "tooltipFontFamily"
  | "tooltipFontSize"
  | "tooltipTextType"
  | "tooltipBold"
  | "tooltipItalic"
  | "tooltipUnderline"
  | "tooltipTextColor"
  | "tooltipLink"
  | "tooltipBullets"
  | "tooltipNumbered"
  | "tooltipAlignLeft"
  | "tooltipAlignCenter"
  | "tooltipAlignRight"
  | "tooltipClearFormatting"
  | "tooltipSave"
  | "tooltipDeleteToTrash"
  | "tooltipRestore"
  | "tooltipDeletePermanent"
  | "tooltipTheme"
  | "tooltipDirection"
  // Context Menu
  | "contextCopy"
  | "contextPaste"
  | "contextSelectAll"
  // Dialogs
  | "dialogPermanentDeleteTitle"
  | "dialogPermanentDeleteMessage"
  | "dialogPermanentDeleteConfirm"
  | "dialogPermanentDeleteCancel"
  | "dialogDeleteDiscardPrompt"
  // Link Dialog
  | "linkDialogAddTitle"
  | "linkDialogEditTitle"
  | "linkDialogUrlLabel"
  | "linkDialogUrlPlaceholder"
  | "linkDialogRemove"
  | "linkDialogCancel"
  | "linkDialogApply"
  // Settings Panel
  | "settingsTitle"
  | "settingsClose"
  | "settingsAppearanceTab"
  | "settingsEditorTab"
  | "settingsNotesTab"
  | "settingsDataTab"
  | "settingsAboutTab"
  // Appearance settings
  | "settingsAppearanceHeader"
  | "settingsAppearanceSub"
  | "settingsRowTheme"
  | "settingsRowThemeDesc"
  | "settingsRowLanguage"
  | "settingsRowLanguageDesc"
  | "settingsRowRailIcons"
  | "settingsRowRailIconsDesc"
  // Editor settings
  | "settingsEditorHeader"
  | "settingsEditorSub"
  | "settingsRowDirection"
  | "settingsRowDirectionDesc"
  | "settingsRowDensity"
  | "settingsRowDensityDesc"
  | "settingsRowFontSize"
  | "settingsRowFontSizeDesc"
  | "settingsRowShowMetadata"
  | "settingsRowShowMetadataDesc"
  | "settingsRowConfirmUnsaved"
  | "settingsRowConfirmUnsavedDesc"
  // Notes settings
  | "settingsNotesHeader"
  | "settingsNotesSub"
  | "settingsRowShowPreviews"
  | "settingsRowShowPreviewsDesc"
  | "settingsRowShowDates"
  | "settingsRowShowDatesDesc"
  // Data settings
  | "settingsDataHeader"
  | "settingsDataSub"
  | "settingsDataDbStatus"
  | "settingsDataFolder"
  | "settingsDataDbFile"
  | "settingsDataSettingsFile"
  | "settingsDataBtnOpen"
  | "settingsDataReady"
  | "settingsDataUnavailable"
  // About settings
  | "settingsAboutHeader"
  | "settingsAboutSub"
  | "settingsAboutVersion"
  | "settingsAboutSQLite"
  | "settingsAboutSaveShort"
  | "settingsAboutTiptap"
  // Footer
  | "footerPhaseScaffold"
  | "footerCategory"
  | "footerDbReady"
  | "footerDbUnavailable"
  | "footerCategoriesCount"
  | "footerNotesCount"
  | "footerSave"
  | "footerDir"
  // Local Backup
  | "settingsDataBackupHeader"
  | "settingsDataBackupSub"
  | "settingsDataBackupAutoToggle"
  | "settingsDataBackupAutoToggleDesc"
  | "settingsDataBackupRetention"
  | "settingsDataBackupRetentionDesc"
  | "settingsDataBackupStatus"
  | "settingsDataBackupFolder"
  | "settingsDataBackupLastTime"
  | "settingsDataBackupCount"
  | "settingsDataBackupBtnCreate"
  | "settingsDataBackupBtnOpen"
  | "settingsDataBackupFailed"
  | "settingsDataBackupSuccess"
  | "settingsDataBackupNoBackups"
  | "tooltipCreateBackup"
  | "tooltipOpenBackupsFolder"
  // Google Auth
  | "googleStatusNotConfigured"
  | "googleStatusNotLinked"
  | "googleStatusLinked"
  | "googleBtnLink"
  | "googleBtnUnlink"
  | "googleStatusStorageUnavailable"
  | "googleSignInFailed"
  | "googleAccountUnlinked"
  | "googlePermissionRevoked"
  // Google Drive Backup
  | "googleBackupHeader"
  | "googleBtnUpload"
  | "googleNoLocalBackup"
  | "googleUploading"
  | "googleUploadSuccess"
  | "googleUploadFailed"
  | "googleLastBackup"
  | "googleAccountLabel"
  | "googleCredentialsMissingHint"
  | "googleLinkFirstHint"
  | "googleStatusReady"
  | "googleLatestLocalBackup"
  | "googleUploadedFiles"
  | "googleCloudFolder"
  | "googleNetworkUnavailable"
  | "googleQuotaExceeded";

const ar: Record<TranslationKeys, string> = {
  appTitle: "NASbook",
  allNotes: "كل الملاحظات",
  projects: "المشاريع",
  channels: "القنوات",
  nas: "NAS",
  personal: "شخصي",
  development: "التطوير",
  errors: "الأخطاء",
  templates: "القوالب",
  archive: "الأرشيف",
  trash: "سلة المهملات",
  notesListTitle: "الملاحظات",
  newNote: "ملاحظة جديدة",
  cannotCreateInTrash: "لا يمكن إنشاء ملاحظات في سلة المهملات",
  currentCategory: "الفئة الحالية",
  trashIsEmpty: "سلة المهملات فارغة.",
  noNotesYet: "لا توجد ملاحظات هنا بعد.",
  pressPlusToCreate: "اضغط + لإنشاء ملاحظة جديدة.",
  noContentYet: "لا يوجد محتوى بعد.",
  updatedAtShort: "آخر تعديل:",
  saved: "تم الحفظ",
  unsavedChanges: "جارٍ التحرير...",
  saving: "جارٍ الحفظ التلقائي...",
  saveError: "فشل الحفظ",
  createdAt: "أنشئت:",
  updatedAt: "تعديل:",
  trashBanner: "⚠️ هذه الملاحظة في سلة المهملات. التعديل معطل. قم باستعادة الملاحظة لتعديلها.",
  noteTitlePlaceholder: "عنوان الملاحظة...",
  editorPlaceholder: "اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة للبدء.",
  editorPlaceholderSubtitle: "يمكنك التنقل بين الفئات وسلة المهملات من الشريط الجانبي.",
  tooltipFontFamily: "عائلة الخط",
  tooltipFontSize: "حجم الخط",
  tooltipTextType: "نوع النص",
  tooltipBold: "عريض — Ctrl+B",
  tooltipItalic: "مائل — Ctrl+I",
  tooltipUnderline: "مسطر",
  tooltipTextColor: "لون النص",
  tooltipLink: "رابط",
  tooltipBullets: "قائمة نقطية",
  tooltipNumbered: "قائمة رقمية",
  tooltipAlignLeft: "محاذاة لليسار",
  tooltipAlignCenter: "محاذاة للوسط",
  tooltipAlignRight: "محاذاة لليمين",
  tooltipClearFormatting: "مسح التنسيق",
  tooltipSave: "حفظ — Ctrl+S",
  tooltipDeleteToTrash: "حذف إلى سلة المهملات",
  tooltipRestore: "استعادة الملاحظة",
  tooltipDeletePermanent: "حذف نهائي",
  tooltipTheme: "تبديل السمة فاتح/داكن",
  tooltipDirection: "اتجاه نص المحرر",
  contextCopy: "نسخ",
  contextPaste: "لصق",
  contextSelectAll: "تحديد الكل",
  dialogPermanentDeleteTitle: "حذف الملاحظة نهائياً؟",
  dialogPermanentDeleteMessage: "سيتم حذف هذه الملاحظة نهائياً من قاعدة بيانات SQLite المحلية. لا يمكن التراجع عن هذا الإجراء.",
  dialogPermanentDeleteConfirm: "حذف نهائي",
  dialogPermanentDeleteCancel: "إلغاء",
  dialogDeleteDiscardPrompt: "لديك تغييرات غير محفوظة. هل تريد تجاهلها؟",
  saveFailedDialogTitle: "تعذر حفظ التغييرات",
  saveFailedDialogBody: "هناك تغييرات لم يتم حفظها. هل تريد تجاهلها والمتابعة؟",
  saveFailedDialogConfirm: "تجاهل والمتابعة",
  saveFailedDialogCancel: "إلغاء",
  linkDialogAddTitle: "إضافة رابط",
  linkDialogEditTitle: "تعديل الرابط",
  linkDialogUrlLabel: "أدخل عنوان URL للرابط المحدد:",
  linkDialogUrlPlaceholder: "example.com",
  linkDialogRemove: "إزالة الرابط",
  linkDialogCancel: "إلغاء",
  linkDialogApply: "تطبيق",
  settingsTitle: "الإعدادات",
  settingsClose: "إغلاق الإعدادات",
  settingsAppearanceTab: "المظهر",
  settingsEditorTab: "المحرر",
  settingsNotesTab: "الملاحظات",
  settingsDataTab: "البيانات",
  settingsAboutTab: "حول التطبيق",
  settingsAppearanceHeader: "المظهر",
  settingsAppearanceSub: "التحكم في واجهة التطبيق وعرض الشريط الجانبي.",
  settingsRowTheme: "السمة",
  settingsRowThemeDesc: "تطبيق مجموعة سمات لونية على مساحة العمل.",
  settingsRowLanguage: "اللغة",
  settingsRowLanguageDesc: "تحديد لغة واجهة المستخدم وتعديل اتجاه تخطيط التطبيق.",
  settingsRowRailIcons: "أيقونات الشريط الجانبي",
  settingsRowRailIconsDesc: "الأيقونات الملونة هي الوضع الافتراضي المستقر. المتكيف يستخدم أقنعة SVG المتوافقة مع السمة.",
  settingsEditorHeader: "المحرر",
  settingsEditorSub: "ضبط اتجاه الكتابة، وكثافة القراءة، وإظهار البيانات الوصفية للملاحظات.",
  settingsRowDirection: "اتجاه النص",
  settingsRowDirectionDesc: "التلقائي يدعم خلط النصوص العربية والإنجليزية دون فرض اتجاه واحد.",
  settingsRowDensity: "الكثافة",
  settingsRowDensityDesc: "تغيير عرض صفحة المحرر والمسافات الداخلية.",
  settingsRowFontSize: "حجم خط المحرر",
  settingsRowFontSizeDesc: "يضبط حجم محتوى المحرر فقط.",
  settingsRowShowMetadata: "إظهار البيانات الوصفية",
  settingsRowShowMetadataDesc: "عرض طوابع أوقات الإنشاء والتعديل أسفل العنوان.",
  settingsRowConfirmUnsaved: "تأكيد التبديل لغير المحفوظ",
  settingsRowConfirmUnsavedDesc: "طلب تأكيد قبل تبديل الملاحظات أو الفئات عند وجود مسودة غير محفوظة.",
  settingsNotesHeader: "الملاحظات",
  settingsNotesSub: "التحكم في كيفية تلخيص بطاقات الملاحظات في القائمة.",
  settingsRowShowPreviews: "إظهار معاينة النص",
  settingsRowShowPreviewsDesc: "عرض معاينة قصيرة للنص في بطاقة كل ملاحظة.",
  settingsRowShowDates: "إظهار تواريخ التعديل",
  settingsRowShowDatesDesc: "عرض تاريخ التحديث في قائمة الملاحظات.",
  settingsDataHeader: "البيانات",
  settingsDataSub: "حالة تخزين SQLite المحلية والوصول إلى مجلد البيانات.",
  settingsDataDbStatus: "حالة قاعدة البيانات",
  settingsDataFolder: "مجلد البيانات",
  settingsDataDbFile: "ملف قاعدة البيانات",
  settingsDataSettingsFile: "ملف الإعدادات",
  settingsDataBtnOpen: "فتح مجلد البيانات",
  settingsDataReady: "جاهز",
  settingsDataUnavailable: "غير متوفر",
  settingsAboutHeader: "حول التطبيق",
  settingsAboutSub: "ملاحظات شخصية محلية أولاً للكتابة باللغتين العربية والإنجليزية.",
  settingsAboutVersion: "إصدار التطبيق",
  settingsAboutSQLite: "قاعدة بيانات SQLite محلية أولاً",
  settingsAboutSaveShort: "الحفظ اليدوي: Ctrl+S",
  settingsAboutTiptap: "محرر النصوص المنسقة: Tiptap",
  footerPhaseScaffold: "الأساس للمرحلة الأولى",
  footerCategory: "الفئة:",
  footerDbReady: "قاعدة البيانات: جاهزة",
  footerDbUnavailable: "قاعدة البيانات: غير متوفرة",
  footerCategoriesCount: "الفئات:",
  footerNotesCount: "الملاحظات:",
  footerSave: "الحفظ:",
  footerDir: "الاتجاه: أساس RTL",
  settingsDataBackupHeader: "النسخ الاحتياطي",
  settingsDataBackupSub: "إعدادات حفظ النسخ الاحتياطية لقاعدة البيانات وملف الإعدادات محلياً.",
  settingsDataBackupAutoToggle: "النسخ الاحتياطي التلقائي",
  settingsDataBackupAutoToggleDesc: "إنشاء نسخة احتياطية تلقائية عند تشغيل التطبيق (مرة واحدة في اليوم).",
  settingsDataBackupRetention: "عدد النسخ المحفوظة",
  settingsDataBackupRetentionDesc: "عدد النسخ الاحتياطية الأخيرة التي سيتم الاحتفاظ بها (سيتم حذف النسخ الأقدم تلقائياً).",
  settingsDataBackupStatus: "حالة النسخ الاحتياطي",
  settingsDataBackupFolder: "مجلد النسخ الاحتياطي",
  settingsDataBackupLastTime: "آخر نسخة احتياطية",
  settingsDataBackupCount: "عدد النسخ الاحتياطية",
  settingsDataBackupBtnCreate: "إنشاء نسخة احتياطية الآن",
  settingsDataBackupBtnOpen: "فتح مجلد النسخ الاحتياطي",
  settingsDataBackupFailed: "فشل إنشاء النسخة الاحتياطية",
  settingsDataBackupSuccess: "تم إنشاء النسخة الاحتياطية بنجاح",
  settingsDataBackupNoBackups: "لا توجد نسخ احتياطية بعد",
  tooltipCreateBackup: "إنشاء نسخة احتياطية محلية جديدة لقاعدة البيانات والإعدادات الآن",
  tooltipOpenBackupsFolder: "فتح المجلد الذي يحتوي على النسخ الاحتياطية في مستكشف الملفات",
  googleStatusNotConfigured: "لم يتم إعداد بيانات Google",
  googleStatusNotLinked: "حساب Google غير مرتبط",
  googleStatusLinked: "حساب Google مرتبط",
  googleBtnLink: "ربط حساب Google",
  googleBtnUnlink: "إلغاء ربط حساب Google",
  googleStatusStorageUnavailable: "تخزين رموز Google غير متاح",
  googleSignInFailed: "فشل تسجيل الدخول إلى Google",
  googleAccountUnlinked: "تم إلغاء ربط حساب Google",
  googlePermissionRevoked: "انتهت الصلاحية أو تم إلغاؤها",
  googleBackupHeader: "النسخ الاحتياطي إلى Google Drive",
  googleBtnUpload: "رفع آخر نسخة احتياطية إلى Google Drive",
  googleNoLocalBackup: "لا توجد نسخة احتياطية محلية",
  googleUploading: "جارٍ رفع النسخة الاحتياطية...",
  googleUploadSuccess: "تم رفع النسخة الاحتياطية إلى Google Drive",
  googleUploadFailed: "فشل رفع النسخة إلى Google Drive",
  googleLastBackup: "آخر نسخة احتياطية سحابية",
  googleAccountLabel: "حساب Google",
  googleCredentialsMissingHint: "أضف ملف google-credentials.json لتفعيل الربط.",
  googleLinkFirstHint: "اربط حساب Google أولاً.",
  googleStatusReady: "جاهز للرفع إلى Google Drive",
  googleLatestLocalBackup: "آخر نسخة احتياطية محلية",
  googleUploadedFiles: "الملفات المرفوعة",
  googleCloudFolder: "مجلد النسخ الاحتياطي السحابي",
  googleNetworkUnavailable: "الشبكة غير متوفرة",
  googleQuotaExceeded: "تم تجاوز الحصة المحددة",
};

const en: Record<TranslationKeys, string> = {
  appTitle: "NASbook",
  allNotes: "All Notes",
  projects: "Projects",
  channels: "Channels",
  nas: "NAS",
  personal: "Personal",
  development: "Development",
  errors: "Errors",
  templates: "Templates",
  archive: "Archive",
  trash: "Trash",
  notesListTitle: "Notes",
  newNote: "New Note",
  cannotCreateInTrash: "Cannot create notes in Trash",
  currentCategory: "Current Category",
  trashIsEmpty: "Trash is empty.",
  noNotesYet: "No notes here yet.",
  pressPlusToCreate: "Press + to create a new note.",
  noContentYet: "No content yet.",
  updatedAtShort: "Updated:",
  saved: "Saved",
  unsavedChanges: "Editing...",
  saving: "Autosaving...",
  saveError: "Save failed",
  createdAt: "Created:",
  updatedAt: "Updated:",
  trashBanner: "⚠️ This note is in Trash. Editing is disabled. Restore the note to edit it.",
  noteTitlePlaceholder: "Note Title...",
  editorPlaceholder: "Select a note from the list or create a new one to start.",
  editorPlaceholderSubtitle: "You can navigate categories and trash from the sidebar.",
  tooltipFontFamily: "Font Family",
  tooltipFontSize: "Font Size",
  tooltipTextType: "Text Type",
  tooltipBold: "Bold — Ctrl+B",
  tooltipItalic: "Italic — Ctrl+I",
  tooltipUnderline: "Underline",
  tooltipTextColor: "Text Color",
  tooltipLink: "Link",
  tooltipBullets: "Bullet List",
  tooltipNumbered: "Numbered List",
  tooltipAlignLeft: "Align Left",
  tooltipAlignCenter: "Align Center",
  tooltipAlignRight: "Align Right",
  tooltipClearFormatting: "Clear Formatting",
  tooltipSave: "Save — Ctrl+S",
  tooltipDeleteToTrash: "Delete to Trash",
  tooltipRestore: "Restore Note",
  tooltipDeletePermanent: "Delete Permanently",
  tooltipTheme: "Toggle light/dark theme",
  tooltipDirection: "Editor text direction",
  contextCopy: "Copy",
  contextPaste: "Paste",
  contextSelectAll: "Select All",
  dialogPermanentDeleteTitle: "Delete note permanently?",
  dialogPermanentDeleteMessage: "This note will be removed from the local SQLite database. This action cannot be undone.",
  dialogPermanentDeleteConfirm: "Delete permanently",
  dialogPermanentDeleteCancel: "Cancel",
  dialogDeleteDiscardPrompt: "You have unsaved changes. Discard them?",
  saveFailedDialogTitle: "Couldn't save changes",
  saveFailedDialogBody: "There are unsaved changes. Discard them and continue?",
  saveFailedDialogConfirm: "Discard and continue",
  saveFailedDialogCancel: "Cancel",
  linkDialogAddTitle: "Add Link",
  linkDialogEditTitle: "Edit Link",
  linkDialogUrlLabel: "Enter URL for the selected link:",
  linkDialogUrlPlaceholder: "example.com",
  linkDialogRemove: "Remove Link",
  linkDialogCancel: "Cancel",
  linkDialogApply: "Apply",
  settingsTitle: "Settings",
  settingsClose: "Close Settings",
  settingsAppearanceTab: "Appearance",
  settingsEditorTab: "Editor",
  settingsNotesTab: "Notes",
  settingsDataTab: "Data",
  settingsAboutTab: "About",
  settingsAppearanceHeader: "Appearance",
  settingsAppearanceSub: "Control the app surface and navigation rail presentation.",
  settingsRowTheme: "Theme",
  settingsRowThemeDesc: "Applies a theme token set to the workspace.",
  settingsRowLanguage: "Language",
  settingsRowLanguageDesc: "Change UI language and adjust app layout direction.",
  settingsRowRailIcons: "Rail icons",
  settingsRowRailIconsDesc: "Colored icons are the stable default. Adaptive uses theme-aware SVG masks.",
  settingsEditorHeader: "Editor",
  settingsEditorSub: "Adjust writing direction, reading density, and metadata visibility.",
  settingsRowDirection: "Direction",
  settingsRowDirectionDesc: "Auto supports mixed Arabic and English without forcing one direction.",
  settingsRowDensity: "Density",
  settingsRowDensityDesc: "Changes editor page width and internal spacing.",
  settingsRowFontSize: "Font size",
  settingsRowFontSizeDesc: "Adjusts editor content size only.",
  settingsRowShowMetadata: "Show metadata",
  settingsRowShowMetadataDesc: "Show created and updated timestamps below the title.",
  settingsRowConfirmUnsaved: "Confirm unsaved switches",
  settingsRowConfirmUnsavedDesc: "Ask before switching notes or categories when a draft is dirty.",
  settingsNotesHeader: "Notes",
  settingsNotesSub: "Control how note cards summarize existing notes.",
  settingsRowShowPreviews: "Show previews",
  settingsRowShowPreviewsDesc: "Display the short body preview in each note card.",
  settingsRowShowDates: "Show dates",
  settingsRowShowDatesDesc: "Display updated dates in the notes list.",
  settingsDataHeader: "Data",
  settingsDataSub: "Local SQLite storage status and data folder access.",
  settingsDataDbStatus: "Database status",
  settingsDataFolder: "Data folder",
  settingsDataDbFile: "Database file",
  settingsDataSettingsFile: "Settings file",
  settingsDataBtnOpen: "Open data folder",
  settingsDataReady: "Ready",
  settingsDataUnavailable: "Unavailable",
  settingsAboutHeader: "About",
  settingsAboutSub: "Local-first personal notes for Arabic and English writing.",
  settingsAboutVersion: "App Version",
  settingsAboutSQLite: "Local-first SQLite database",
  settingsAboutSaveShort: "Manual save: Ctrl+S",
  settingsAboutTiptap: "Rich text editor: Tiptap",
  footerPhaseScaffold: "Phase 1 scaffold",
  footerCategory: "Category:",
  footerDbReady: "DB: Ready",
  footerDbUnavailable: "DB: Unavailable",
  footerCategoriesCount: "Categories:",
  footerNotesCount: "Notes:",
  footerSave: "Save:",
  footerDir: "DIR: RTL foundation",
  settingsDataBackupHeader: "Local Backup",
  settingsDataBackupSub: "Safe local database and settings backup configuration.",
  settingsDataBackupAutoToggle: "Automatic Backup",
  settingsDataBackupAutoToggleDesc: "Perform automatic backup on app startup (once per day).",
  settingsDataBackupRetention: "Retention Count",
  settingsDataBackupRetentionDesc: "Number of latest backups to keep (older backups will be deleted).",
  settingsDataBackupStatus: "Backup Status",
  settingsDataBackupFolder: "Backup Folder",
  settingsDataBackupLastTime: "Last Backup",
  settingsDataBackupCount: "Backup Count",
  settingsDataBackupBtnCreate: "Create Backup Now",
  settingsDataBackupBtnOpen: "Open Backups Folder",
  settingsDataBackupFailed: "Backup creation failed",
  settingsDataBackupSuccess: "Backup created successfully",
  settingsDataBackupNoBackups: "No backups yet",
  tooltipCreateBackup: "Create a new local backup of database and settings now",
  tooltipOpenBackupsFolder: "Open the folder containing local backups in file explorer",
  googleStatusNotConfigured: "Google credentials not configured",
  googleStatusNotLinked: "Google account not linked",
  googleStatusLinked: "Google account linked",
  googleBtnLink: "Link Google account",
  googleBtnUnlink: "Unlink Google account",
  googleStatusStorageUnavailable: "Google token storage unavailable",
  googleSignInFailed: "Google sign-in failed",
  googleAccountUnlinked: "Google account unlinked",
  googlePermissionRevoked: "Permission revoked or expired",
  googleBackupHeader: "Google Drive Backup",
  googleBtnUpload: "Upload latest backup to Google Drive",
  googleNoLocalBackup: "No local backup found",
  googleUploading: "Uploading backup...",
  googleUploadSuccess: "Backup uploaded to Google Drive",
  googleUploadFailed: "Google Drive upload failed",
  googleLastBackup: "Last cloud backup",
  googleAccountLabel: "Google account",
  googleCredentialsMissingHint: "Add google-credentials.json to enable Google linking.",
  googleLinkFirstHint: "Link your Google account first.",
  googleStatusReady: "Ready to upload to Google Drive",
  googleLatestLocalBackup: "Latest local backup",
  googleUploadedFiles: "Uploaded files",
  googleCloudFolder: "Cloud backup folder",
  googleNetworkUnavailable: "Network unavailable",
  googleQuotaExceeded: "Quota exceeded",
};

export function t(key: TranslationKeys, lang: AppLanguage): string {
  const dictionary = lang === "ar" ? ar : en;
  return dictionary[key] || en[key] || key;
}

export function getCategoryDisplayName(
  slug: CategorySlug,
  defaultName: string,
  lang: AppLanguage,
): string {
  if (lang === "ar") {
    switch (slug) {
      case "all-notes":
        return "كل الملاحظات";
      case "prompts":
        return "المشاريع";
      case "chatgpt-instructions":
        return "القنوات";
      case "nas-projects":
        return "NAS";
      case "powershell-commands":
        return "شخصي";
      case "development-notes":
        return "التطوير";
      case "errors-fixes":
        return "الأخطاء";
      case "templates":
        return "القوالب";
      case "archive":
        return "الأرشيف";
      case "trash":
        return "سلة المهملات";
      default:
        return defaultName;
    }
  } else {
    switch (slug) {
      case "all-notes":
        return "All Notes";
      case "prompts":
        return "Projects";
      case "chatgpt-instructions":
        return "Channels";
      case "nas-projects":
        return "NAS";
      case "powershell-commands":
        return "Personal";
      case "development-notes":
        return "Development";
      case "errors-fixes":
        return "Errors";
      case "templates":
        return "Templates";
      case "archive":
        return "Archive";
      case "trash":
        return "Trash";
      default:
        return defaultName;
    }
  }
}
