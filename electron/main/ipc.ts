import { ipcMain, shell, dialog, BrowserWindow } from "electron";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import type {
  AppInfo,
  CreateNoteInput,
  MarkdownExportInput,
  MarkdownExportResult,
  MarkdownImportResult,
  NoteListOptions,
  UpdateNoteInput,
  NasbkSaveInput,
  NasbkSaveResult,
  NasbkImportResult,
} from "../../src/shared/ipc";
import type { AppSettings } from "../../src/shared/settings";
import type { NotesbookDatabase } from "./db";
import type { SettingsStore } from "./settingsStore";
import type { BackupService } from "./backupService";
import type { GoogleAuthService } from "./googleAuthService";
import { GoogleDriveBackupService } from "./googleDriveBackupService";

export async function parseAndValidateNasbk(filePath: string): Promise<NasbkImportResult> {
  try {
    const contentStr = await readFile(filePath, "utf8");
    if (!contentStr || contentStr.trim() === "") {
      throw new Error("File is empty.");
    }
    
    const data = JSON.parse(contentStr);

    if (!data || typeof data !== "object") {
      throw new Error("Invalid file content. Must be a valid JSON object.");
    }

    if (data.format !== "NASBK") {
      throw new Error("Invalid format. File is not a NASBK document.");
    }

    if (data.formatVersion === undefined || data.formatVersion === null) {
      throw new Error("Invalid document. Missing formatVersion.");
    }

    if (typeof data.title !== "string" || typeof data.contentHtml !== "string") {
      throw new Error("Invalid NASBK document content. title and contentHtml must be strings.");
    }

    return {
      ok: true,
      filePath,
      title: data.title,
      contentHtml: data.contentHtml,
      contentText: data.contentText || "",
      metadata: data.metadata || {
        isRtl: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      formatVersion: data.formatVersion,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface RegisterIpcOptions {
  readonly appName: string;
  readonly appVersion: string;
  readonly database: NotesbookDatabase;
  readonly settingsStore: SettingsStore;
  readonly backupService: BackupService;
  readonly googleAuthService: GoogleAuthService;
  readonly googleDriveBackupService: GoogleDriveBackupService;
}

export function registerIpcHandlers({
  appName,
  appVersion,
  database,
  settingsStore,
  backupService,
  googleAuthService,
  googleDriveBackupService,
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

  ipcMain.handle(
    "markdown:importFile",
    async (): Promise<MarkdownImportResult> => {
      try {
        const result = await dialog.showOpenDialog({
          title: "Import Markdown",
          properties: ["openFile"],
          filters: [
            { name: "Markdown", extensions: ["md", "markdown", "txt"] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { ok: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        const markdown = await readFile(filePath, "utf8");
        return { ok: true, filename: path.basename(filePath), markdown };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ipcMain.handle(
    "markdown:exportFile",
    async (
      _event,
      input: MarkdownExportInput,
    ): Promise<MarkdownExportResult> => {
      try {
        const result = await dialog.showSaveDialog({
          title: "Export Markdown",
          defaultPath: input.defaultFilename,
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });

        if (result.canceled || !result.filePath) {
          return { ok: false, canceled: true };
        }

        await writeFile(result.filePath, input.markdown, "utf8");
        return { ok: true, path: result.filePath };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ipcMain.handle(
    "nasbk:saveFile",
    async (
      _event,
      input: NasbkSaveInput,
    ): Promise<NasbkSaveResult> => {
      try {
        let filePath = input.filePath;
        if (!filePath) {
          const result = await dialog.showSaveDialog({
            title: "Save as NASBK",
            defaultPath: `${input.title}.nasbk`,
            filters: [{ name: "NASBK Document", extensions: ["nasbk"] }],
          });

          if (result.canceled || !result.filePath) {
            return { ok: false, canceled: true };
          }
          filePath = result.filePath;
        }

        const payload = {
          format: "NASBK",
          title: input.title,
          contentHtml: input.contentHtml,
          contentText: input.contentText,
          metadata: input.metadata,
          formatVersion: input.formatVersion,
        };

        await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
        return { ok: true, path: filePath };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ipcMain.handle(
    "nasbk:importFile",
    async (): Promise<NasbkImportResult> => {
      try {
        const result = await dialog.showOpenDialog({
          title: "Import NASBK Note",
          properties: ["openFile"],
          filters: [
            { name: "NASBK Document", extensions: ["nasbk"] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { ok: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        return await parseAndValidateNasbk(filePath);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

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

  ipcMain.handle("cloudBackup:getStatus", async () => {
    return googleDriveBackupService.getStatus();
  });

  ipcMain.handle("cloudBackup:uploadLatest", async () => {
    return googleDriveBackupService.uploadLatest();
  });

  ipcMain.handle("window:minimize", (event): void => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle("window:toggleMaximize", (event): void => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle("window:close", (event): void => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle("window:isMaximized", (event): boolean => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });
}
