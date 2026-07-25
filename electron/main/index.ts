import { app, BrowserWindow, shell, Menu, ipcMain } from "electron";
import path from "node:path";
import { createNotesbookDatabase, type NotesbookDatabase } from "./db";
import {
  isWindowCloseApproved,
  registerIpcHandlers,
  parseAndValidateNasbk,
} from "./ipc";
import { createSettingsStore } from "./settingsStore";
import { createBackupService } from "./backupService";
import { createGoogleAuthService } from "./googleAuthService";
import { createGoogleDriveBackupService } from "./googleDriveBackupService";
import { createGmailBackupService } from "./gmailBackupService";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
  let notesbookDatabase: NotesbookDatabase | null = null;
  let mainWindow: BrowserWindow | null = null;
  let fileToOpenOnStartup: string | null = null;

  app.setName("NASbook");

  function getFilePathFromArgs(args: string[]): string | null {
    for (const arg of args) {
      if (arg.toLowerCase().endsWith(".nasbk") && !arg.startsWith("-")) {
        return arg;
      }
    }
    return null;
  }

  const startupFile = getFilePathFromArgs(process.argv);
  if (startupFile) {
    fileToOpenOnStartup = startupFile;
  }

  app.on("second-instance", async (_event, commandLine) => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();

    const filePath = getFilePathFromArgs(commandLine);
    if (!filePath) return;
    try {
      const result = await parseAndValidateNasbk(filePath);
      mainWindow.webContents.send("nasbk:openFile", result);
    } catch (error) {
      console.error("Failed to parse NASBK file from secondary instance:", error);
    }
  });

  function getPreloadPath(): string {
    return path.join(__dirname, "../preload/index.js");
  }

  function getRendererEntry(): string {
    return path.join(__dirname, "../../renderer/index.html");
  }

  function createMainWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1320,
      height: 860,
      minWidth: 1080,
      minHeight: 720,
      title: "NASbook",
      icon: path.join(app.getAppPath(), "assets/icon.ico"),
      backgroundColor: "#FBFBFA",
      show: false,
      frame: false,
      webPreferences: {
        preload: getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
    });

    mainWindow.on("close", (event) => {
      const window = mainWindow;
      if (
        window &&
        !isWindowCloseApproved(window) &&
        !window.webContents.isDestroyed()
      ) {
        event.preventDefault();
        window.webContents.send("window:close-requested");
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });

    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
      void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      void mainWindow.loadFile(getRendererEntry());
    }
  }

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const userDataPath = app.getPath("userData");
    notesbookDatabase = createNotesbookDatabase(userDataPath);
    const settingsStore = createSettingsStore(userDataPath);

    const backupService = createBackupService(
      userDataPath,
      notesbookDatabase.databasePath,
      settingsStore,
      () => notesbookDatabase?.checkpoint?.(),
    );

    const googleAuthService = createGoogleAuthService(userDataPath, settingsStore);
    const googleDriveBackupService = createGoogleDriveBackupService(
      userDataPath,
      googleAuthService,
      settingsStore,
    );
    const gmailBackupService = createGmailBackupService(
      backupService,
      googleAuthService,
      settingsStore,
    );

    setTimeout(() => {
      void backupService
        .runStartupBackup()
        .then(async (result) => {
          if (result?.success && settingsStore.getSettings().gmailBackupEnabled) {
            const gmailResult = await gmailBackupService.sendLatest();
            if (!gmailResult.ok) {
              console.error("Automatic Gmail backup failed:", gmailResult.error);
            }
          }
        })
        .catch((error) => {
          console.error("Startup auto-backup failed:", error);
        });
    }, 1000);

    ipcMain.handle("nasbk:getStartupFile", async () => {
      if (!fileToOpenOnStartup) {
        return null;
      }
      const result = await parseAndValidateNasbk(fileToOpenOnStartup);
      fileToOpenOnStartup = null;
      return result;
    });

    registerIpcHandlers({
      appName: app.getName(),
      appVersion: app.getVersion(),
      database: notesbookDatabase,
      settingsStore,
      backupService,
      googleAuthService,
      googleDriveBackupService,
      gmailBackupService,
    });

    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    notesbookDatabase?.close();
    notesbookDatabase = null;
  });
}
