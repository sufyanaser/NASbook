import { app, BrowserWindow, shell, Menu } from "electron";
import path from "node:path";
import { createNotesbookDatabase, type NotesbookDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";
import { createSettingsStore } from "./settingsStore";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
let notesbookDatabase: NotesbookDatabase | null = null;

app.setName("NAS Notesbook");

function getPreloadPath(): string {
  return path.join(__dirname, "../preload/index.js");
}

function getRendererEntry(): string {
  return path.join(__dirname, "../../renderer/index.html");
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "NAS Notesbook",
    icon: path.join(app.getAppPath(), "assets/icon.ico"),
    backgroundColor: "#FBFBFA",
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
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
  registerIpcHandlers({
    appName: app.getName(),
    appVersion: app.getVersion(),
    database: notesbookDatabase,
    settingsStore,
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
