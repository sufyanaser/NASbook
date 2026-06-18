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
};

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
  };
}
