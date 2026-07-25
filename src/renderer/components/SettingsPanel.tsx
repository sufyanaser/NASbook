import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appThemes,
  backupFrequencies,
  editorDensities,
  editorDirections,
  editorFontSizes,
  railIconModes,
  type AppLanguage,
  type AppSettings,
} from "../../shared/settings";
import type {
  AppInfo,
  BackupStatus,
  CloudBackupInfo,
  GmailBackupInfo,
} from "../../shared/ipc";
import { APP_COMMANDS, type AppCommand } from "../../shared/commands";
import { ConfirmDialog } from "./ConfirmDialog";
import "../styles/settings-center.css";

type SettingsSection =
  | "general"
  | "appearance"
  | "editor"
  | "notes"
  | "backup"
  | "integrations"
  | "shortcuts"
  | "about";

interface SettingsPanelProps {
  readonly appInfo: AppInfo | null;
  readonly isOpen: boolean;
  readonly settings: AppSettings;
  readonly onClose: () => void;
  readonly onOpenDataFolder: () => void;
  readonly onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

interface FeedbackState {
  readonly type: "success" | "error" | "info";
  readonly message: string;
}

const SECTION_ORDER: readonly SettingsSection[] = [
  "general",
  "appearance",
  "editor",
  "notes",
  "backup",
  "integrations",
  "shortcuts",
  "about",
];

function copy(language: AppLanguage) {
  const ar = language === "ar";
  return {
    title: ar ? "الإعدادات" : "Settings",
    subtitle: ar ? "مركز التحكم الكامل بتجربة NASbook" : "Control every part of NASbook",
    search: ar ? "ابحث داخل الإعدادات" : "Search settings",
    close: ar ? "إغلاق" : "Close",
    saved: ar ? "يتم حفظ التغييرات تلقائياً" : "Changes are saved automatically",
    sections: {
      general: ar ? "عام" : "General",
      appearance: ar ? "المظهر" : "Appearance",
      editor: ar ? "المحرر" : "Editor",
      notes: ar ? "الملاحظات" : "Notes",
      backup: ar ? "النسخ الاحتياطي" : "Backup",
      integrations: ar ? "التكاملات" : "Integrations",
      shortcuts: ar ? "الاختصارات" : "Shortcuts",
      about: ar ? "حول التطبيق" : "About",
    } satisfies Record<SettingsSection, string>,
    generalTitle: ar ? "الإعدادات العامة" : "General settings",
    generalSub: ar ? "اللغة ومسارات البيانات الأساسية." : "Language and core data locations.",
    language: ar ? "لغة الواجهة" : "Interface language",
    languageDesc: ar ? "تغيير لغة NASbook واتجاه واجهة الإعدادات." : "Change NASbook language and settings direction.",
    dataLocation: ar ? "موقع بيانات التطبيق" : "Application data location",
    dataLocationDesc: ar ? "قاعدة البيانات والإعدادات المحلية." : "Local database and settings files.",
    openFolder: ar ? "فتح المجلد" : "Open folder",
    appearanceTitle: ar ? "المظهر والهوية" : "Appearance and identity",
    appearanceSub: ar ? "المظهر العام وأسلوب الأيقونات." : "Application theme and icon treatment.",
    theme: ar ? "الثيم" : "Theme",
    themeDesc: ar ? "اختر المظهر الأنسب للعمل الطويل." : "Choose the most suitable theme for long sessions.",
    iconStyle: ar ? "أسلوب الأيقونات" : "Icon style",
    iconStyleDesc: ar ? "ملون وفق هوية NASbook أو متكيف مع الثيم." : "NASbook color identity or theme-adaptive icons.",
    editorTitle: ar ? "المحرر" : "Editor",
    editorSub: ar ? "الاتجاه والكثافة وحجم الخط وسلوك الحفظ." : "Direction, density, type size, and save behavior.",
    direction: ar ? "اتجاه الكتابة الافتراضي" : "Default writing direction",
    density: ar ? "عرض مساحة التحرير" : "Editor width",
    fontSize: ar ? "حجم خط المحرر" : "Editor font size",
    metadata: ar ? "إظهار بيانات الملاحظة" : "Show note metadata",
    confirmUnsaved: ar ? "تأكيد الانتقال عند وجود تعديل" : "Confirm switching with unsaved edits",
    notesTitle: ar ? "عرض الملاحظات" : "Notes display",
    notesSub: ar ? "تحكم بالمعلومات الظاهرة داخل قائمة الملاحظات." : "Control information shown in the notes list.",
    previews: ar ? "إظهار معاينة المحتوى" : "Show content previews",
    dates: ar ? "إظهار تواريخ الملاحظات" : "Show note dates",
    backupTitle: ar ? "النسخ الاحتياطي المحلي" : "Local backup",
    backupSub: ar ? "نسخ موثوقة لقاعدة البيانات والإعدادات في موقع تختاره." : "Reliable database and settings copies in a location you choose.",
    autoBackup: ar ? "النسخ التلقائي" : "Automatic backup",
    autoBackupDesc: ar ? "إنشاء نسخة عند تشغيل التطبيق وفق الجدول المحدد." : "Create a backup when the application starts according to the selected schedule.",
    frequency: ar ? "تكرار النسخ" : "Backup frequency",
    daily: ar ? "مرة واحدة يومياً" : "Once per day",
    everyLaunch: ar ? "عند كل تشغيل" : "Every launch",
    retention: ar ? "عدد النسخ المحفوظة" : "Retained backups",
    retentionDesc: ar ? "يحذف NASbook النسخ الأقدم تلقائياً." : "NASbook automatically removes the oldest copies.",
    backupLocation: ar ? "موقع النسخ الاحتياطي" : "Backup location",
    defaultLocation: ar ? "الموقع الافتراضي داخل بيانات التطبيق" : "Default location inside application data",
    chooseLocation: ar ? "تحديد موقع" : "Choose location",
    resetLocation: ar ? "إعادة للافتراضي" : "Reset to default",
    createNow: ar ? "إنشاء نسخة الآن" : "Create backup now",
    openBackups: ar ? "فتح مجلد النسخ" : "Open backup folder",
    backupReady: ar ? "جاهز" : "Ready",
    noBackup: ar ? "لا توجد نسخة بعد" : "No backup yet",
    backupCount: ar ? "عدد النسخ" : "Backup count",
    lastBackup: ar ? "آخر نسخة" : "Latest backup",
    integrationsTitle: ar ? "Google Drive وGmail" : "Google Drive and Gmail",
    integrationsSub: ar ? "حساب Google واحد لخدمتي التخزين والإرسال." : "One Google account for cloud storage and email delivery.",
    googleAccount: ar ? "حساب Google" : "Google account",
    connected: ar ? "مرتبط" : "Connected",
    notConnected: ar ? "غير مرتبط" : "Not connected",
    link: ar ? "ربط الحساب" : "Link account",
    relink: ar ? "إعادة ربط الحساب" : "Reconnect account",
    unlink: ar ? "إلغاء الربط" : "Unlink",
    driveTitle: "Google Drive",
    driveDesc: ar ? "رفع أحدث نسخة إلى مجلد NASbook Backups." : "Upload the latest copy to the NASbook Backups folder.",
    uploadDrive: ar ? "رفع أحدث نسخة" : "Upload latest backup",
    gmailTitle: "Gmail Backup",
    gmailDesc: ar ? "إرسال أحدث نسخة كمرفقات إلى نفس حساب Gmail المرتبط." : "Send the latest backup as attachments to the linked Gmail account.",
    gmailAutomatic: ar ? "إرسال تلقائي بعد النسخ المحلي" : "Send automatically after local backup",
    sendGmail: ar ? "إرسال أحدث نسخة إلى Gmail" : "Send latest backup to Gmail",
    gmailPermission: ar ? "يجب إلغاء الربط وإعادة ربط الحساب مرة واحدة للموافقة على صلاحية Gmail." : "Disconnect and reconnect once to approve Gmail sending permission.",
    lastSent: ar ? "آخر إرسال" : "Last sent",
    shortcutsTitle: ar ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts",
    shortcutsSub: ar ? "غيّر الاختصارات بدون تعارضات." : "Customize shortcuts without conflicts.",
    edit: ar ? "تعديل" : "Edit",
    clear: ar ? "مسح" : "Clear",
    cancel: ar ? "إلغاء" : "Cancel",
    pressShortcut: ar ? "اضغط الاختصار الجديد" : "Press the new shortcut",
    none: ar ? "لا يوجد" : "None",
    conflictTitle: ar ? "تعارض اختصار" : "Shortcut conflict",
    conflictMessage: ar ? "الاختصار مستخدم لأمر آخر. هل تريد نقله إلى هذا الأمر؟" : "This shortcut is already assigned. Move it to this command?",
    replace: ar ? "نقل الاختصار" : "Move shortcut",
    aboutTitle: ar ? "حول NASbook" : "About NASbook",
    aboutSub: ar ? "معلومات الإصدار ومسارات التخزين." : "Version and storage information.",
    version: ar ? "الإصدار" : "Version",
    database: ar ? "قاعدة البيانات" : "Database",
    settingsFile: ar ? "ملف الإعدادات" : "Settings file",
    unavailable: ar ? "غير متاح" : "Unavailable",
    successBackup: ar ? "تم إنشاء النسخة الاحتياطية بنجاح." : "Backup created successfully.",
    successDrive: ar ? "تم رفع أحدث نسخة إلى Google Drive." : "Latest backup uploaded to Google Drive.",
    successGmail: ar ? "تم إرسال أحدث نسخة إلى Gmail." : "Latest backup sent to Gmail.",
    processing: ar ? "جارٍ التنفيذ..." : "Working...",
    configureGoogle: ar ? "أضف google-credentials.json ثم أعد تشغيل التطبيق." : "Add google-credentials.json and restart the application.",
  };
}

function labelForValue(value: string, language: AppLanguage): string {
  const ar = language === "ar";
  const labels: Record<string, readonly [string, string]> = {
    dark: ["داكن", "Dark"],
    light: ["فاتح", "Light"],
    graphite: ["غرافيت", "Graphite"],
    "material-dark": ["ماتيريال داكن", "Material Dark"],
    ulysses: ["يوليسيس", "Ulysses"],
    "one-dark": ["ون دارك", "One Dark"],
    colored: ["ملون", "Colored"],
    adaptive: ["متكيف", "Adaptive"],
    auto: ["تلقائي", "Auto"],
    rtl: ["من اليمين إلى اليسار", "Right to left"],
    ltr: ["من اليسار إلى اليمين", "Left to right"],
    compact: ["مدمج", "Compact"],
    comfortable: ["مريح", "Comfortable"],
    wide: ["عريض", "Wide"],
    small: ["صغير", "Small"],
    medium: ["متوسط", "Medium"],
    large: ["كبير", "Large"],
  };
  const pair = labels[value];
  return pair ? pair[ar ? 0 : 1] : value;
}

function SettingsCard({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="settings-center-card">
      <div className="settings-center-card-heading">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-center-card-body">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  readonly label: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="settings-center-row">
      <div className="settings-center-row-copy">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="settings-center-row-control">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}): JSX.Element {
  return (
    <label className="settings-center-toggle">
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" />
      <em>{label}</em>
    </label>
  );
}

function Feedback({ feedback }: { readonly feedback: FeedbackState | null }): JSX.Element | null {
  if (!feedback) return null;
  return (
    <div className="settings-center-feedback" data-type={feedback.type} role="status">
      {feedback.message}
    </div>
  );
}

export function SettingsPanel({
  appInfo,
  isOpen,
  settings,
  onClose,
  onOpenDataFolder,
  onUpdateSettings,
}: SettingsPanelProps): JSX.Element | null {
  const language = settings.language;
  const c = copy(language);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudBackupInfo | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailBackupInfo | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [capturingCommandId, setCapturingCommandId] = useState<string | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const [conflictState, setConflictState] = useState<{
    readonly targetCommandId: string;
    readonly newShortcut: string;
    readonly conflictingCommand: AppCommand;
  } | null>(null);

  const refreshBackup = useCallback(async (): Promise<void> => {
    if (!window.nasNotesbook) return;
    setBackupStatus(await window.nasNotesbook.backup.getStatus());
  }, []);

  const refreshIntegrations = useCallback(async (): Promise<void> => {
    if (!window.nasNotesbook) return;
    const [drive, gmail] = await Promise.all([
      window.nasNotesbook.cloudBackup.getStatus(),
      window.nasNotesbook.gmailBackup.getStatus(),
    ]);
    setCloudStatus(drive);
    setGmailStatus(gmail);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void refreshBackup();
    void refreshIntegrations();
  }, [isOpen, refreshBackup, refreshIntegrations]);

  useEffect(() => {
    if (capturingCommandId) {
      captureInputRef.current?.focus();
    }
  }, [capturingCommandId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (capturingCommandId) {
          setCapturingCommandId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [capturingCommandId, isOpen, onClose]);

  const visibleSections = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return SECTION_ORDER;
    return SECTION_ORDER.filter((section) => {
      return c.sections[section].toLocaleLowerCase().includes(query);
    });
  }, [c.sections, searchQuery]);

  const runAction = async (
    name: string,
    action: () => Promise<void>,
  ): Promise<void> => {
    if (busyAction) return;
    setBusyAction(name);
    setFeedback(null);
    try {
      await action();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const createBackup = async (): Promise<void> => {
    await runAction("backup", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.backup.create();
      if (!result.success) {
        throw new Error(result.error || "Backup failed");
      }
      await refreshBackup();
      setFeedback({ type: "success", message: c.successBackup });
      if (settings.gmailBackupEnabled) {
        const gmailResult = await window.nasNotesbook.gmailBackup.sendLatest();
        await refreshIntegrations();
        if (!gmailResult.ok) {
          setFeedback({
            type: "error",
            message: `${c.successBackup} ${gmailResult.error || "Gmail backup failed"}`,
          });
        }
      }
    });
  };

  const chooseBackupFolder = async (): Promise<void> => {
    await runAction("choose-folder", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.backup.chooseFolder();
      if (!result.ok && !result.canceled) {
        throw new Error(result.error || "Unable to choose backup folder");
      }
      await refreshBackup();
    });
  };

  const resetBackupFolder = async (): Promise<void> => {
    await runAction("reset-folder", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.backup.resetFolder();
      if (!result.ok) {
        throw new Error(result.error || "Unable to reset backup folder");
      }
      await refreshBackup();
    });
  };

  const linkGoogle = async (): Promise<void> => {
    await runAction("google-link", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.googleAuth.link();
      if (result.error) throw new Error(result.message || result.error);
      await refreshIntegrations();
      setFeedback({ type: "success", message: c.connected });
    });
  };

  const unlinkGoogle = async (): Promise<void> => {
    await runAction("google-unlink", async () => {
      if (!window.nasNotesbook) return;
      await window.nasNotesbook.googleAuth.unlink();
      await refreshIntegrations();
    });
  };

  const uploadDrive = async (): Promise<void> => {
    await runAction("drive", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.cloudBackup.uploadLatest();
      if (!result.ok) throw new Error(result.error || "Google Drive upload failed");
      await refreshIntegrations();
      setFeedback({ type: "success", message: c.successDrive });
    });
  };

  const sendGmail = async (): Promise<void> => {
    await runAction("gmail", async () => {
      if (!window.nasNotesbook) return;
      const result = await window.nasNotesbook.gmailBackup.sendLatest();
      if (!result.ok) throw new Error(result.error || "Gmail backup failed");
      await refreshIntegrations();
      setFeedback({ type: "success", message: c.successGmail });
    });
  };

  const saveShortcut = (commandId: string, shortcut: string): void => {
    const conflictingCommand = APP_COMMANDS.find(
      (command) =>
        command.id !== commandId && settings.shortcuts[command.id] === shortcut,
    );
    if (conflictingCommand) {
      setConflictState({
        targetCommandId: commandId,
        newShortcut: shortcut,
        conflictingCommand,
      });
      return;
    }
    onUpdateSettings({
      shortcuts: { ...settings.shortcuts, [commandId]: shortcut },
    });
    setCapturingCommandId(null);
  };

  const resolveShortcutConflict = (): void => {
    if (!conflictState) return;
    onUpdateSettings({
      shortcuts: {
        ...settings.shortcuts,
        [conflictState.conflictingCommand.id]: "",
        [conflictState.targetCommandId]: conflictState.newShortcut,
      },
    });
    setConflictState(null);
    setCapturingCommandId(null);
  };

  if (!isOpen) return null;

  const sectionHeader = (title: string, subtitle: string): JSX.Element => (
    <div className="settings-center-section-heading">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );

  return (
    <div
      className="settings-center-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label={c.title}
        aria-modal="true"
        className="settings-center"
        dir={language === "ar" ? "rtl" : "ltr"}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settings-center-header">
          <div className="settings-center-title">
            <span>NASbook</span>
            <h1>{c.title}</h1>
            <p>{c.subtitle}</p>
          </div>
          <div className="settings-center-header-actions">
            <label className="settings-center-search">
              <span aria-hidden="true">⌕</span>
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={c.search}
                value={searchQuery}
              />
            </label>
            <button
              aria-label={c.close}
              className="settings-center-close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <div className="settings-center-layout">
          <nav className="settings-center-nav" aria-label={c.title}>
            {visibleSections.map((section) => (
              <button
                data-active={activeSection === section}
                key={section}
                onClick={() => {
                  setActiveSection(section);
                  setFeedback(null);
                }}
                type="button"
              >
                <span>{c.sections[section]}</span>
              </button>
            ))}
            <div className="settings-center-nav-footer">
              <span>{appInfo?.version ? `v${appInfo.version}` : "NASbook"}</span>
              <small>{c.saved}</small>
            </div>
          </nav>

          <main className="settings-center-content">
            <Feedback feedback={feedback} />

            {activeSection === "general" && (
              <>
                {sectionHeader(c.generalTitle, c.generalSub)}
                <SettingsCard title={c.language} description={c.languageDesc}>
                  <SettingRow label={c.language}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({ language: event.target.value as AppLanguage })
                      }
                      value={settings.language}
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </SettingRow>
                </SettingsCard>
                <SettingsCard title={c.dataLocation} description={c.dataLocationDesc}>
                  <div className="settings-center-paths">
                    <code>{appInfo?.dataDirectory ?? c.unavailable}</code>
                    <button onClick={onOpenDataFolder} type="button">
                      {c.openFolder}
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeSection === "appearance" && (
              <>
                {sectionHeader(c.appearanceTitle, c.appearanceSub)}
                <SettingsCard title={c.appearanceTitle}>
                  <SettingRow label={c.theme} description={c.themeDesc}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          theme: event.target.value as AppSettings["theme"],
                        })
                      }
                      value={settings.theme}
                    >
                      {appThemes.map((theme) => (
                        <option key={theme} value={theme}>
                          {labelForValue(theme, language)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow label={c.iconStyle} description={c.iconStyleDesc}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          railIconMode: event.target.value as AppSettings["railIconMode"],
                        })
                      }
                      value={settings.railIconMode}
                    >
                      {railIconModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {labelForValue(mode, language)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeSection === "editor" && (
              <>
                {sectionHeader(c.editorTitle, c.editorSub)}
                <SettingsCard title={c.editorTitle}>
                  <SettingRow label={c.direction}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          editorDirection: event.target.value as AppSettings["editorDirection"],
                        })
                      }
                      value={settings.editorDirection}
                    >
                      {editorDirections.map((value) => (
                        <option key={value} value={value}>
                          {labelForValue(value, language)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow label={c.density}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          editorDensity: event.target.value as AppSettings["editorDensity"],
                        })
                      }
                      value={settings.editorDensity}
                    >
                      {editorDensities.map((value) => (
                        <option key={value} value={value}>
                          {labelForValue(value, language)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow label={c.fontSize}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          fontSize: event.target.value as AppSettings["fontSize"],
                        })
                      }
                      value={settings.fontSize}
                    >
                      {editorFontSizes.map((value) => (
                        <option key={value} value={value}>
                          {labelForValue(value, language)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow label={c.metadata}>
                    <Toggle
                      checked={settings.showMetadata}
                      label={c.metadata}
                      onChange={(showMetadata) => onUpdateSettings({ showMetadata })}
                    />
                  </SettingRow>
                  <SettingRow label={c.confirmUnsaved}>
                    <Toggle
                      checked={settings.confirmUnsavedSwitch}
                      label={c.confirmUnsaved}
                      onChange={(confirmUnsavedSwitch) =>
                        onUpdateSettings({ confirmUnsavedSwitch })
                      }
                    />
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeSection === "notes" && (
              <>
                {sectionHeader(c.notesTitle, c.notesSub)}
                <SettingsCard title={c.notesTitle}>
                  <SettingRow label={c.previews}>
                    <Toggle
                      checked={settings.showNotePreview}
                      label={c.previews}
                      onChange={(showNotePreview) => onUpdateSettings({ showNotePreview })}
                    />
                  </SettingRow>
                  <SettingRow label={c.dates}>
                    <Toggle
                      checked={settings.showNoteDates}
                      label={c.dates}
                      onChange={(showNoteDates) => onUpdateSettings({ showNoteDates })}
                    />
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeSection === "backup" && (
              <>
                {sectionHeader(c.backupTitle, c.backupSub)}
                <SettingsCard title={c.backupTitle}>
                  <SettingRow label={c.autoBackup} description={c.autoBackupDesc}>
                    <Toggle
                      checked={settings.autoBackupEnabled}
                      label={c.autoBackup}
                      onChange={(autoBackupEnabled) =>
                        onUpdateSettings({ autoBackupEnabled })
                      }
                    />
                  </SettingRow>
                  <SettingRow label={c.frequency}>
                    <select
                      disabled={!settings.autoBackupEnabled}
                      onChange={(event) =>
                        onUpdateSettings({
                          backupFrequency: event.target.value as AppSettings["backupFrequency"],
                        })
                      }
                      value={settings.backupFrequency}
                    >
                      {backupFrequencies.map((value) => (
                        <option key={value} value={value}>
                          {value === "daily" ? c.daily : c.everyLaunch}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow label={c.retention} description={c.retentionDesc}>
                    <select
                      onChange={(event) =>
                        onUpdateSettings({
                          backupRetentionCount: Number(event.target.value),
                        })
                      }
                      value={settings.backupRetentionCount}
                    >
                      {[5, 10, 20, 50, 100].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </SettingRow>
                </SettingsCard>

                <SettingsCard title={c.backupLocation}>
                  <div className="settings-center-location">
                    <code>{backupStatus?.backupsFolder ?? c.defaultLocation}</code>
                    <div>
                      <button
                        disabled={busyAction !== null}
                        onClick={() => void chooseBackupFolder()}
                        type="button"
                      >
                        {c.chooseLocation}
                      </button>
                      <button
                        disabled={!backupStatus?.usesCustomFolder || busyAction !== null}
                        onClick={() => void resetBackupFolder()}
                        type="button"
                      >
                        {c.resetLocation}
                      </button>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title={c.backupReady}>
                  <div className="settings-center-stats">
                    <div><span>{c.backupCount}</span><strong>{backupStatus?.backupCount ?? 0}</strong></div>
                    <div><span>{c.lastBackup}</span><strong>{backupStatus?.lastBackupAt ? new Date(backupStatus.lastBackupAt).toLocaleString(language === "ar" ? "ar-IQ" : "en-US") : c.noBackup}</strong></div>
                  </div>
                  <div className="settings-center-actions">
                    <button
                      className="primary"
                      disabled={busyAction !== null}
                      onClick={() => void createBackup()}
                      type="button"
                    >
                      {busyAction === "backup" ? c.processing : c.createNow}
                    </button>
                    <button
                      disabled={busyAction !== null}
                      onClick={() => void window.nasNotesbook?.backup.openFolder()}
                      type="button"
                    >
                      {c.openBackups}
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeSection === "integrations" && (
              <>
                {sectionHeader(c.integrationsTitle, c.integrationsSub)}
                <SettingsCard title={c.googleAccount}>
                  <div className="settings-center-account">
                    <div>
                      <strong>{cloudStatus?.email ?? c.notConnected}</strong>
                      <span>{cloudStatus?.linked ? c.connected : c.notConnected}</span>
                    </div>
                    <div>
                      {!cloudStatus?.configured ? (
                        <span className="settings-center-warning">{c.configureGoogle}</span>
                      ) : cloudStatus.linked ? (
                        <button disabled={busyAction !== null} onClick={() => void unlinkGoogle()} type="button">{c.unlink}</button>
                      ) : (
                        <button className="primary" disabled={busyAction !== null} onClick={() => void linkGoogle()} type="button">{c.link}</button>
                      )}
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title={c.driveTitle} description={c.driveDesc}>
                  <SettingRow label={c.lastBackup}>
                    <span>{cloudStatus?.lastCloudBackupAt ? new Date(cloudStatus.lastCloudBackupAt).toLocaleString(language === "ar" ? "ar-IQ" : "en-US") : c.noBackup}</span>
                  </SettingRow>
                  <div className="settings-center-actions">
                    <button
                      className="primary"
                      disabled={!cloudStatus?.linked || busyAction !== null || !backupStatus?.backupCount}
                      onClick={() => void uploadDrive()}
                      type="button"
                    >
                      {busyAction === "drive" ? c.processing : c.uploadDrive}
                    </button>
                  </div>
                </SettingsCard>

                <SettingsCard title={c.gmailTitle} description={c.gmailDesc}>
                  <SettingRow label={c.gmailAutomatic}>
                    <Toggle
                      checked={settings.gmailBackupEnabled}
                      disabled={!gmailStatus?.linked}
                      label={c.gmailAutomatic}
                      onChange={(gmailBackupEnabled) =>
                        onUpdateSettings({ gmailBackupEnabled })
                      }
                    />
                  </SettingRow>
                  <SettingRow label={c.lastSent}>
                    <span>{gmailStatus?.lastGmailBackupAt ? new Date(gmailStatus.lastGmailBackupAt).toLocaleString(language === "ar" ? "ar-IQ" : "en-US") : c.noBackup}</span>
                  </SettingRow>
                  {gmailStatus?.status === "permission_required" && (
                    <div className="settings-center-warning-block">
                      <span>{c.gmailPermission}</span>
                      <button onClick={() => void unlinkGoogle()} type="button">{c.relink}</button>
                    </div>
                  )}
                  <div className="settings-center-actions">
                    <button
                      className="primary"
                      disabled={!gmailStatus?.linked || busyAction !== null || !backupStatus?.backupCount}
                      onClick={() => void sendGmail()}
                      type="button"
                    >
                      {busyAction === "gmail" ? c.processing : c.sendGmail}
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeSection === "shortcuts" && (
              <>
                {sectionHeader(c.shortcutsTitle, c.shortcutsSub)}
                <SettingsCard title={c.shortcutsTitle}>
                  <div className="settings-center-shortcuts">
                    {APP_COMMANDS.map((command) => {
                      const shortcut = settings.shortcuts[command.id] || "";
                      const isCapturing = capturingCommandId === command.id;
                      const commandName = language === "ar" ? command.nameAr : command.nameEn;
                      return (
                        <div className="settings-center-shortcut" key={command.id}>
                          <strong>{commandName}</strong>
                          {isCapturing ? (
                            <div className="settings-center-capture">
                              <input
                                onKeyDown={(event) => {
                                  event.preventDefault();
                                  if (event.key === "Escape") {
                                    setCapturingCommandId(null);
                                    return;
                                  }
                                  if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
                                  const parts: string[] = [];
                                  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
                                  if (event.altKey) parts.push("Alt");
                                  if (event.shiftKey) parts.push("Shift");
                                  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key === " " ? "Space" : event.key);
                                  saveShortcut(command.id, parts.join("+"));
                                }}
                                placeholder={c.pressShortcut}
                                readOnly
                                ref={captureInputRef}
                              />
                              <button onClick={() => setCapturingCommandId(null)} type="button">{c.cancel}</button>
                            </div>
                          ) : (
                            <div className="settings-center-shortcut-actions">
                              <span>{shortcut || c.none}</span>
                              <button onClick={() => setCapturingCommandId(command.id)} type="button">{c.edit}</button>
                              {shortcut && (
                                <button onClick={() => onUpdateSettings({ shortcuts: { ...settings.shortcuts, [command.id]: "" } })} type="button">{c.clear}</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </SettingsCard>
              </>
            )}

            {activeSection === "about" && (
              <>
                {sectionHeader(c.aboutTitle, c.aboutSub)}
                <SettingsCard title="NASbook">
                  <div className="settings-center-about-grid">
                    <span>{c.version}</span><strong>{appInfo?.version ?? c.unavailable}</strong>
                    <span>{c.database}</span><code>{appInfo?.databasePath ?? c.unavailable}</code>
                    <span>{c.settingsFile}</span><code>{appInfo?.settingsPath ?? c.unavailable}</code>
                  </div>
                </SettingsCard>
              </>
            )}
          </main>
        </div>
      </section>

      <ConfirmDialog
        cancelLabel={c.cancel}
        confirmLabel={c.replace}
        isOpen={Boolean(conflictState)}
        message={c.conflictMessage}
        onCancel={() => setConflictState(null)}
        onConfirm={resolveShortcutConflict}
        title={c.conflictTitle}
      />
    </div>
  );
}
