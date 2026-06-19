import { copyFile, mkdir, readdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { shell } from "electron";
import type { BackupStatus, BackupResult } from "../../src/shared/ipc";
import type { SettingsStore } from "./settingsStore";

// Pure helper function to format a date to local YYYY-MM-DD and HHmmss
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

// Pure helper function to generate backup filenames for a given timestamp
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

// Pure helper function to find older files to delete based on retention count
export function getRetentionActions(filenames: string[], retentionCount: number): string[] {
  const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
  const timestamps: string[] = [];

  for (const name of filenames) {
    const match = dbPattern.exec(name);
    if (match) {
      timestamps.push(match[1]);
    }
  }

  // Sort lexicographically (oldest first)
  timestamps.sort();

  if (timestamps.length <= retentionCount) {
    return [];
  }

  const toDeleteTimestamps = timestamps.slice(0, timestamps.length - retentionCount);
  const filesToDelete: string[] = [];

  for (const ts of toDeleteTimestamps) {
    const names = getBackupFilenames(ts);
    filesToDelete.push(names.dbFile, names.settingsFile, names.metaFile);
  }

  return filesToDelete;
}

export interface BackupService {
  getStatus: () => Promise<BackupStatus>;
  createBackup: () => Promise<BackupResult>;
  openFolder: () => Promise<void>;
  runStartupBackup: () => Promise<void>;
}

export function createBackupService(
  userDataPath: string,
  databasePath: string,
  settingsStore: SettingsStore,
  checkpointDatabase?: () => void
): BackupService {
  const backupsFolder = path.join(userDataPath, "backups");
  let lastError: string | null = null;

  // Resolves the latest backup's timestamp and date
  const getLatestBackupTime = async (filenames: string[]): Promise<string | null> => {
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

    // Sort to get the latest
    timestamps.sort();
    const latestTs = timestamps[timestamps.length - 1];
    
    // Attempt to read metadata file
    const names = getBackupFilenames(latestTs);
    const metaPath = path.join(backupsFolder, names.metaFile);
    try {
      if (existsSync(metaPath)) {
        const raw = await readFile(metaPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.timestamp === "string") {
          return parsed.timestamp;
        }
      }
    } catch (err) {
      console.error("Failed to read latest backup metadata:", err);
    }

    // Fallback: parse from timestamp YYYY-MM-DD-HHmmss in local date format
    const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(latestTs);
    if (match) {
      const [, yyyy, mm, dd, hh, min, ss] = match;
      const date = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(hh),
        Number(min),
        Number(ss)
      );
      return date.toISOString();
    }

    return null;
  };

  const getStatus = async (): Promise<BackupStatus> => {
    const currentSettings = settingsStore.getSettings();
    let backupCount = 0;
    let lastBackupAt: string | null = null;
    let lastBackupFileName: string | null = null;

    try {
      if (existsSync(backupsFolder)) {
        const files = await readdir(backupsFolder);
        const dbPattern = /^nas-notesbook-backup-(\d{4}-\d{2}-\d{2}-\d{6})\.db$/;
        const dbFiles = files.filter((f) => dbPattern.test(f));
        backupCount = dbFiles.length;
        if (dbFiles.length > 0) {
          dbFiles.sort();
          lastBackupFileName = dbFiles[dbFiles.length - 1];
        }
        lastBackupAt = await getLatestBackupTime(files);
      }
    } catch (err: any) {
      console.error("Failed to retrieve backup directory status:", err);
    }

    return {
      backupsFolder,
      lastBackupAt,
      lastBackupFileName,
      backupCount,
      autoBackupEnabled: currentSettings.autoBackupEnabled,
      retentionCount: currentSettings.backupRetentionCount,
      lastError,
    };
  };

  const createBackup = async (): Promise<BackupResult> => {
    try {
      await mkdir(backupsFolder, { recursive: true });

      const date = new Date();
      const { dateStr, timeStr } = getLocalDateString(date);
      const timestamp = `${dateStr}-${timeStr}`;
      const names = getBackupFilenames(timestamp);

      const dbDest = path.join(backupsFolder, names.dbFile);
      const settingsDest = path.join(backupsFolder, names.settingsFile);
      const metaDest = path.join(backupsFolder, names.metaFile);

      if (existsSync(dbDest)) {
        throw new Error(`Backup file already exists: ${names.dbFile}`);
      }

      // Checkpoint DB to flush write ahead logs
      if (checkpointDatabase) {
        checkpointDatabase();
      }

      // Copy database file
      await copyFile(databasePath, dbDest);

      // Copy settings.json if exists
      let settingsCopied = false;
      const settingsPath = settingsStore.settingsPath;
      if (existsSync(settingsPath)) {
        await copyFile(settingsPath, settingsDest);
        settingsCopied = true;
      }

      // Create metadata manifest
      const metadata = {
        timestamp: date.toISOString(),
        localTime: `${dateStr} ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`,
        databaseFile: names.dbFile,
        settingsFile: settingsCopied ? names.settingsFile : null,
        version: "0.2.0",
      };
      await writeFile(metaDest, JSON.stringify(metadata, null, 2), "utf8");

      // Apply retention policy
      const files = await readdir(backupsFolder);
      const currentSettings = settingsStore.getSettings();
      const filesToDelete = getRetentionActions(files, currentSettings.backupRetentionCount);

      for (const fileToDelete of filesToDelete) {
        const fullPath = path.join(backupsFolder, fileToDelete);
        try {
          if (existsSync(fullPath)) {
            await rm(fullPath, { force: true });
          }
        } catch (err) {
          console.error(`Failed to delete old backup file ${fullPath}:`, err);
        }
      }

      lastError = null;
      return {
        success: true,
        lastBackupAt: metadata.timestamp,
      };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error("Backup creation failed:", err);
      lastError = errMsg;
      return {
        success: false,
        error: errMsg,
      };
    }
  };

  const openFolder = async (): Promise<void> => {
    await mkdir(backupsFolder, { recursive: true });
    const result = await shell.openPath(backupsFolder);
    if (result) {
      throw new Error(result);
    }
  };

  const runStartupBackup = async (): Promise<void> => {
    const currentSettings = settingsStore.getSettings();
    if (!currentSettings.autoBackupEnabled) {
      return;
    }

    try {
      const todayStr = getLocalDateString(new Date()).dateStr;
      if (existsSync(backupsFolder)) {
        const files = await readdir(backupsFolder);
        const todayPattern = new RegExp(`^nas-notesbook-backup-${todayStr}-\\d{6}\\.db$`);
        const todayBackupExists = files.some((f) => todayPattern.test(f));
        if (todayBackupExists) {
          return;
        }
      }

      console.log(`Running daily auto-backup for ${todayStr}...`);
      const result = await createBackup();
      if (result.success) {
        console.log("Daily auto-backup completed successfully.");
      } else {
        console.error("Daily auto-backup failed:", result.error);
      }
    } catch (err) {
      console.error("Startup auto-backup verification failed:", err);
    }
  };

  return {
    getStatus,
    createBackup,
    openFolder,
    runStartupBackup,
  };
}
