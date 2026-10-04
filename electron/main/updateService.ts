import { app, Notification } from "electron";
import * as electronUpdater from "electron-updater";
import type { UpdateStatusInfo } from "../../src/shared/ipc";

const { autoUpdater } = electronUpdater;
const INITIAL_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let initialized = false;
let checkInProgress = false;
let initialCheckTimer: NodeJS.Timeout | null = null;
let periodicCheckTimer: NodeJS.Timeout | null = null;
let currentStatusState: UpdateStatusInfo = {
  status: "idle",
  currentVersion: "8.0.0",
};

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
    currentStatusState = { status: "checking", currentVersion: app.getVersion() || "8.0.0" };
  });
  autoUpdater.on("update-available", (info) => {
    console.info(`NASbook update ${info.version} is available; download started.`);
    currentStatusState = { status: "available", currentVersion: app.getVersion() || "8.0.0", availableVersion: info.version };
  });
  autoUpdater.on("update-not-available", (info) => {
    console.info(`NASbook ${info.version} is up to date.`);
    currentStatusState = { status: "not-available", currentVersion: app.getVersion() || "8.0.0" };
  });
  autoUpdater.on("update-downloaded", (info) => {
    console.info(`NASbook update ${info.version} is ready and will install on exit.`);
    currentStatusState = { status: "downloaded", currentVersion: app.getVersion() || "8.0.0", availableVersion: info.version };
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
    currentStatusState = {
      status: "error",
      currentVersion: app.getVersion() || "8.0.0",
      error: error instanceof Error ? error.message : String(error),
    };
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

export function getUpdateStatus(): UpdateStatusInfo {
  return currentStatusState;
}

export async function checkForUpdatesManual(): Promise<UpdateStatusInfo> {
  if (!app.isPackaged || process.platform !== "win32") {
    currentStatusState = {
      status: "not-available",
      currentVersion: app.getVersion() || "8.0.0",
    };
    return currentStatusState;
  }
  await checkForUpdates();
  return currentStatusState;
}

export function disposeUpdateService(): void {
  if (initialCheckTimer) clearTimeout(initialCheckTimer);
  if (periodicCheckTimer) clearInterval(periodicCheckTimer);
  initialCheckTimer = null;
  periodicCheckTimer = null;
}
