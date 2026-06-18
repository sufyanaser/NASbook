import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  defaultAppSettings,
  normalizeAppSettings,
  type AppSettings,
} from "../../src/shared/settings";

export interface SettingsStore {
  readonly settingsPath: string;
  getSettings: () => AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => AppSettings;
}

export function createSettingsStore(userDataPath: string): SettingsStore {
  const settingsPath = path.join(userDataPath, "settings.json");

  const readSettings = (): AppSettings => {
    try {
      const raw = readFileSync(settingsPath, "utf8");
      return normalizeAppSettings(JSON.parse(raw));
    } catch {
      return defaultAppSettings;
    }
  };

  const writeSettings = (settings: AppSettings): void => {
    mkdirSync(userDataPath, { recursive: true });
    const temporaryPath = `${settingsPath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
    });
    renameSync(temporaryPath, settingsPath);
  };

  return {
    settingsPath,
    getSettings: readSettings,
    updateSettings: (settings) => {
      const nextSettings = normalizeAppSettings({
        ...readSettings(),
        ...settings,
      });
      writeSettings(nextSettings);
      return nextSettings;
    },
  };
}
