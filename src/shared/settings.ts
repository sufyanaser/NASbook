export type AppTheme =
  | "dark"
  | "light"
  | "graphite"
  | "material-dark"
  | "ulysses"
  | "one-dark";

export type RailIconMode = "colored" | "adaptive";

export type EditorDirection = "auto" | "rtl" | "ltr";

export type EditorDensity = "compact" | "comfortable" | "wide";

export type EditorFontSize = "small" | "medium" | "large";

export type AppLanguage = "ar" | "en";

export const appLanguages = ["ar", "en"] as const satisfies readonly AppLanguage[];

export interface AppSettings {
  readonly theme: AppTheme;
  readonly railIconMode: RailIconMode;
  readonly editorDirection: EditorDirection;
  readonly editorDensity: EditorDensity;
  readonly fontSize: EditorFontSize;
  readonly showMetadata: boolean;
  readonly showNotePreview: boolean;
  readonly showNoteDates: boolean;
  readonly confirmUnsavedSwitch: boolean;
  readonly language: AppLanguage;
  readonly autoBackupEnabled: boolean;
  readonly backupRetentionCount: number;
  readonly cloudBackupEnabled: boolean;
  readonly lastCloudBackupAt: string | null;
  readonly lastCloudBackupFileName: string | null;
}

export const appThemes = [
  "dark",
  "light",
  "graphite",
  "material-dark",
  "ulysses",
  "one-dark",
] as const satisfies readonly AppTheme[];

export const railIconModes = [
  "colored",
  "adaptive",
] as const satisfies readonly RailIconMode[];

export const editorDirections = [
  "auto",
  "rtl",
  "ltr",
] as const satisfies readonly EditorDirection[];

export const editorDensities = [
  "compact",
  "comfortable",
  "wide",
] as const satisfies readonly EditorDensity[];

export const editorFontSizes = [
  "small",
  "medium",
  "large",
] as const satisfies readonly EditorFontSize[];

export const defaultAppSettings: AppSettings = {
  theme: "dark",
  railIconMode: "colored",
  editorDirection: "auto",
  editorDensity: "comfortable",
  fontSize: "medium",
  showMetadata: true,
  showNotePreview: true,
  showNoteDates: true,
  confirmUnsavedSwitch: true,
  language: "ar",
  autoBackupEnabled: true,
  backupRetentionCount: 10,
  cloudBackupEnabled: false,
  lastCloudBackupAt: null,
  lastCloudBackupFileName: null,
};

export function isLightLikeTheme(theme: AppTheme): boolean {
  return theme === "light" || theme === "ulysses";
}

export function getToggledLightDarkTheme(theme: AppTheme): AppTheme {
  return isLightLikeTheme(theme) ? "dark" : "light";
}

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return defaultAppSettings;
  }

  const candidate = value as Partial<Record<keyof AppSettings, unknown>>;

  return {
    theme: isOneOf(candidate.theme, appThemes)
      ? candidate.theme
      : defaultAppSettings.theme,
    railIconMode: isOneOf(candidate.railIconMode, railIconModes)
      ? candidate.railIconMode
      : defaultAppSettings.railIconMode,
    editorDirection: isOneOf(candidate.editorDirection, editorDirections)
      ? candidate.editorDirection
      : defaultAppSettings.editorDirection,
    editorDensity: isOneOf(candidate.editorDensity, editorDensities)
      ? candidate.editorDensity
      : defaultAppSettings.editorDensity,
    fontSize: isOneOf(candidate.fontSize, editorFontSizes)
      ? candidate.fontSize
      : defaultAppSettings.fontSize,
    showMetadata:
      typeof candidate.showMetadata === "boolean"
        ? candidate.showMetadata
        : defaultAppSettings.showMetadata,
    showNotePreview:
      typeof candidate.showNotePreview === "boolean"
        ? candidate.showNotePreview
        : defaultAppSettings.showNotePreview,
    showNoteDates:
      typeof candidate.showNoteDates === "boolean"
        ? candidate.showNoteDates
        : defaultAppSettings.showNoteDates,
    confirmUnsavedSwitch:
      typeof candidate.confirmUnsavedSwitch === "boolean"
        ? candidate.confirmUnsavedSwitch
        : defaultAppSettings.confirmUnsavedSwitch,
    language: isOneOf(candidate.language, appLanguages)
      ? candidate.language
      : defaultAppSettings.language,
    autoBackupEnabled:
      typeof candidate.autoBackupEnabled === "boolean"
        ? candidate.autoBackupEnabled
        : defaultAppSettings.autoBackupEnabled,
    backupRetentionCount:
      typeof candidate.backupRetentionCount === "number" &&
      Number.isInteger(candidate.backupRetentionCount) &&
      candidate.backupRetentionCount > 0
        ? candidate.backupRetentionCount
        : defaultAppSettings.backupRetentionCount,
    cloudBackupEnabled:
      typeof candidate.cloudBackupEnabled === "boolean"
        ? candidate.cloudBackupEnabled
        : defaultAppSettings.cloudBackupEnabled,
    lastCloudBackupAt:
      typeof candidate.lastCloudBackupAt === "string" || candidate.lastCloudBackupAt === null
        ? candidate.lastCloudBackupAt
        : defaultAppSettings.lastCloudBackupAt,
    lastCloudBackupFileName:
      typeof candidate.lastCloudBackupFileName === "string" || candidate.lastCloudBackupFileName === null
        ? candidate.lastCloudBackupFileName
        : defaultAppSettings.lastCloudBackupFileName,
  };
}
