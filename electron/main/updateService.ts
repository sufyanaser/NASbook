import { app, Notification } from "electron";
import * as electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
const INITIAL_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let initialized = false;
let checkInProgress = false;
let initialCheckTimer: NodeJS.Timeout | null = null;
let periodicCheckTimer: NodeJS.Timeout | null = null;

async function checkForUpdates(): Promise<void> {
  if (checkInProgress) return;

  checkInProgress = true;
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error("Automatic update check failed:", error);
  } finally {
    checkInProgress = false;
  }
}

export function initializeUpdateService(): void {
  if (initialized || !app.isPackaged || process.platform !== "win32") return;
  initialized = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;

  autoUpdater.on("checking-for-update", () => {
    console.info("Checking for NASbook updates.");
  });
  autoUpdater.on("update-available", (info) => {
    console.info(`NASbook update ${info.version} is available; download started.`);
  });
  autoUpdater.on("update-not-available", (info) => {
    console.info(`NASbook ${info.version} is up to date.`);
  });
  autoUpdater.on("update-downloaded", (info) => {
    console.info(`NASbook update ${info.version} is ready and will install on exit.`);
    if (Notification.isSupported()) {
      new Notification({
        title: "NASbook",
        body: "تم تنزيل تحديث جديد وسيتم تثبيته عند إغلاق البرنامج.",
        silent: true,
      }).show();
    }
  });
  autoUpdater.on("error", (error) => {
    console.error("NASbook updater error:", error);
  });

  initialCheckTimer = setTimeout(() => {
    initialCheckTimer = null;
    void checkForUpdates();
  }, INITIAL_CHECK_DELAY_MS);
  initialCheckTimer.unref();

  periodicCheckTimer = setInterval(() => {
    void checkForUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);
  periodicCheckTimer.unref();
}

export function disposeUpdateService(): void {
  if (initialCheckTimer) clearTimeout(initialCheckTimer);
  if (periodicCheckTimer) clearInterval(periodicCheckTimer);
  initialCheckTimer = null;
  periodicCheckTimer = null;
}
