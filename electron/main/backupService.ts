import { copyFile, mkdir, readdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { shell } from "electron";
import type { BackupStatus, BackupResult } from "../../src/shared/ipc";
import type { SettingsStore } from "./settingsStore";

export function getLocalDateString(date: Date): { dateStr: string; timeStr: string } {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}${min}${ss}`,
  };
}

export function getBackupFilenames(timestamp: string): {
  dbFile: string;
  settingsFile: string;
  metaFile: string;
} {
  return {
    dbFile: `nas-notesbook-backup-${timestamp}.db`,
    settingsFile: `nas-notesbook-settings-${timestamp}.json`,
    metaFile: `nas-notesbook-backup-${timestamp}.meta.json`,
  };
}

export function getRetentionActions(filenames: string[], retentionCount: number): string[] {
  const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
  const timestamps: string[] = [];

  for (const name of filenames) {
    const match = dbPattern.exec(name);
    if (match) {
      timestamps.push(match[1]);
    }
  }

  timestamps.sort();
  if (timestamps.length <= retentionCount) {
    return [];
  }

  const toDeleteTimestamps = timestamps.slice(0, timestamps.length - retentionCount);
  const filesToDelete: string[] = [];
  for (const timestamp of toDeleteTimestamps) {
    const names = getBackupFilenames(timestamp);
    filesToDelete.push(names.dbFile, names.settingsFile, names.metaFile);
  }
  return filesToDelete;
}

export interface BackupService {
  getStatus: () => Promise<BackupStatus>;
  getBackupsFolder: () => string;
  createBackup: () => Promise<BackupResult>;
  openFolder: () => Promise<void>;
  runStartupBackup: () => Promise<BackupResult | null>;
}

export function createBackupService(
  userDataPath: string,
  databasePath: string,
  settingsStore: SettingsStore,
  checkpointDatabase?: () => void,
): BackupService {
  let lastError: string | null = null;

  const getBackupsFolder = (): string => {
    const configured = settingsStore.getSettings().backupDirectory;
    return configured || path.join(userDataPath, "backups");
  };

  const getLatestBackupTime = async (
    backupsFolder: string,
    filenames: string[],
  ): Promise<string | null> => {
    const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
    const timestamps: string[] = [];

    for (const name of filenames) {
      const match = dbPattern.exec(name);
      if (match) {
        timestamps.push(match[1]);
      }
    }

    if (timestamps.length === 0) {
      return null;
    }

    timestamps.sort();
    const latestTimestamp = timestamps[timestamps.length - 1];
    const names = getBackupFilenames(latestTimestamp);
    const metaPath = path.join(backupsFolder, names.metaFile);

    try {
      if (existsSync(metaPath)) {
        const raw = await readFile(metaPath, "utf8");
        const parsed = JSON.parse(raw) as { timestamp?: unknown };
        if (typeof parsed.timestamp === "string") {
          return parsed.timestamp;
        }
      }
    } catch (error) {
      console.error("Failed to read latest backup metadata:", error);
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(
      latestTimestamp,
    );
    if (!match) {
      return null;
    }

    const [, yyyy, mm, dd, hh, min, ss] = match;
    return new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    ).toISOString();
  };

  const getStatus = async (): Promise<BackupStatus> => {
    const currentSettings = settingsStore.getSettings();
    const backupsFolder = getBackupsFolder();
    let backupCount = 0;
    let lastBackupAt: string | null = null;
    let lastBackupFileName: string | null = null;

    try {
      if (existsSync(backupsFolder)) {
        const files = await readdir(backupsFolder);
        const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
        const dbFiles = files.filter((file) => dbPattern.test(file)).sort();
        backupCount = dbFiles.length;
        lastBackupFileName = dbFiles.at(-1) ?? null;
        lastBackupAt = await getLatestBackupTime(backupsFolder, files);
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    return {
      backupsFolder,
      usesCustomFolder: currentSettings.backupDirectory !== null,
      lastBackupAt,
      lastBackupFileName,
      backupCount,
      autoBackupEnabled: currentSettings.autoBackupEnabled,
      retentionCount: currentSettings.backupRetentionCount,
      frequency: currentSettings.backupFrequency,
      lastError,
    };
  };

  const createBackup = async (): Promise<BackupResult> => {
    const backupsFolder = getBackupsFolder();
    try {
      await mkdir(backupsFolder, { recursive: true });

      const date = new Date();
      const { dateStr, timeStr } = getLocalDateString(date);
      const timestamp = `${dateStr}-${timeStr}`;
      const names = getBackupFilenames(timestamp);
      const dbDestination = path.join(backupsFolder, names.dbFile);
      const settingsDestination = path.join(backupsFolder, names.settingsFile);
      const metaDestination = path.join(backupsFolder, names.metaFile);

      if (existsSync(dbDestination)) {
        throw new Error(`Backup file already exists: ${names.dbFile}`);
      }

      checkpointDatabase?.();
      await copyFile(databasePath, dbDestination);

      let settingsCopied = false;
      if (existsSync(settingsStore.settingsPath)) {
        await copyFile(settingsStore.settingsPath, settingsDestination);
        settingsCopied = true;
      }

      const metadata = {
        timestamp: date.toISOString(),
        localTime: `${dateStr} ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`,
        databaseFile: names.dbFile,
        settingsFile: settingsCopied ? names.settingsFile : null,
        application: "NASbook",
        version: "0.10.0",
      };
      await writeFile(metaDestination, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

      const files = await readdir(backupsFolder);
      const retentionCount = settingsStore.getSettings().backupRetentionCount;
      for (const fileToDelete of getRetentionActions(files, retentionCount)) {
        const fullPath = path.join(backupsFolder, fileToDelete);
        if (existsSync(fullPath)) {
          try {
            await rm(fullPath, { force: true });
          } catch (error) {
            console.error(`Failed to delete old backup file ${fullPath}:`, error);
          }
        }
      }

      lastError = null;
      return { success: true, lastBackupAt: metadata.timestamp };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      return { success: false, error: message };
    }
  };

  const openFolder = async (): Promise<void> => {
    const backupsFolder = getBackupsFolder();
    await mkdir(backupsFolder, { recursive: true });
    const result = await shell.openPath(backupsFolder);
    if (result) {
      throw new Error(result);
    }
  };

  const runStartupBackup = async (): Promise<BackupResult | null> => {
    const settings = settingsStore.getSettings();
    if (!settings.autoBackupEnabled) {
      return null;
    }

    const backupsFolder = getBackupsFolder();
    const today = getLocalDateString(new Date()).dateStr;

    if (settings.backupFrequency === "daily" && existsSync(backupsFolder)) {
      const files = await readdir(backupsFolder);
      const todayPattern = new RegExp(
        `^nas-notesbook-backup-${today}-\\d{6}\\.db$`,
      );
      if (files.some((file) => todayPattern.test(file))) {
        return null;
      }
    }

    return createBackup();
  };

  return {
    getStatus,
    getBackupsFolder,
    createBackup,
    openFolder,
    runStartupBackup,
  };
}
