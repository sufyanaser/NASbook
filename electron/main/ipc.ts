import { ipcMain, shell } from "electron";
import path from "node:path";
import type {
  AppInfo,
  CreateNoteInput,
  NoteListOptions,
  UpdateNoteInput,
} from "../../src/shared/ipc";
import type { AppSettings } from "../../src/shared/settings";
import type { NotesbookDatabase } from "./db";
import type { SettingsStore } from "./settingsStore";
import type { BackupService } from "./backupService";
import type { GoogleAuthService } from "./googleAuthService";

interface RegisterIpcOptions {
  readonly appName: string;
  readonly appVersion: string;
  readonly database: NotesbookDatabase;
  readonly settingsStore: SettingsStore;
  readonly backupService: BackupService;
  readonly googleAuthService: GoogleAuthService;
}

export function registerIpcHandlers({
  appName,
  appVersion,
  database,
  settingsStore,
  backupService,
  googleAuthService,
}: RegisterIpcOptions): void {
  ipcMain.handle("app:getInfo", (): AppInfo => {
    const dataDirectory = path.dirname(database.databasePath);

    return {
      name: appName,
      version: appVersion,
      phase: "phase-2-data-layer",
      databasePath: database.databasePath,
      dataDirectory,
      settingsPath: settingsStore.settingsPath,
    };
  });

  ipcMain.handle("app:openDataFolder", async () => {
    const dataDirectory = path.dirname(database.databasePath);
    const result = await shell.openPath(dataDirectory);

    if (result) {
      throw new Error(result);
    }
  });

  ipcMain.handle("settings:get", () => {
    return settingsStore.getSettings();
  });

  ipcMain.handle("settings:update", (_event, settings: Partial<AppSettings>) => {
    return settingsStore.updateSettings(settings);
  });

  ipcMain.handle("categories:list", () => {
    return database.listCategories();
  });

  ipcMain.handle("notes:list", (_event, options?: NoteListOptions) => {
    return database.listNotes(options);
  });

  ipcMain.handle("notes:getById", (_event, id: number) => {
    return database.getNoteById(id);
  });

  ipcMain.handle("notes:create", (_event, input?: CreateNoteInput) => {
    return database.createNote(input);
  });

  ipcMain.handle("notes:update", (_event, input: UpdateNoteInput) => {
    return database.updateNote(input);
  });

  ipcMain.handle("notes:deleteToTrash", (_event, id: number) => {
    database.deleteNoteToTrash(id);
  });

  ipcMain.handle("notes:restore", (_event, id: number) => {
    database.restoreNote(id);
  });

  ipcMain.handle("notes:deletePermanent", (_event, id: number) => {
    database.deleteNotePermanent(id);
  });

  ipcMain.handle("backup:create", async () => {
    return backupService.createBackup();
  });

  ipcMain.handle("backup:getStatus", async () => {
    return backupService.getStatus();
  });

  ipcMain.handle("backup:openFolder", async () => {
    return backupService.openFolder();
  });

  ipcMain.handle("googleAuth:link", async () => {
    return googleAuthService.link();
  });

  ipcMain.handle("googleAuth:unlink", async () => {
    return googleAuthService.unlink();
  });

  ipcMain.handle("googleAuth:getStatus", async () => {
    return googleAuthService.getStatus();
  });
}
