import { ipcMain } from "electron";
import type { AppInfo } from "../../src/shared/ipc";
import type { NotesbookDatabase } from "./db";

interface RegisterIpcOptions {
  readonly appName: string;
  readonly appVersion: string;
  readonly database: NotesbookDatabase;
}

export function registerIpcHandlers({
  appName,
  appVersion,
  database,
}: RegisterIpcOptions): void {
  ipcMain.handle("app:getInfo", (): AppInfo => {
    return {
      name: appName,
      version: appVersion,
      phase: "phase-2-data-layer",
      databasePath: database.databasePath,
    };
  });

  ipcMain.handle("categories:list", () => {
    return database.listCategories();
  });

  ipcMain.handle("notes:list", () => {
    return database.listNotes();
  });
}
