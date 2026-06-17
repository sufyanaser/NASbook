import { ipcMain } from "electron";
import type {
  AppInfo,
  CreateNoteInput,
  NoteListOptions,
  UpdateNoteInput,
} from "../../src/shared/ipc";
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
}
