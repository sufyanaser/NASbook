from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:100]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "electron/main/googleAuthService.ts",
    '''        const scopes = [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/userinfo.email",
        ];''',
    '''        const scopes = [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/userinfo.email",
        ];''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  NasbkImportResult,
} from "../../src/shared/ipc";''',
    '''  NasbkImportResult,
  BackupLocationResult,
} from "../../src/shared/ipc";''',
)

replace_once(
    "electron/main/ipc.ts",
    '''import { GoogleDriveBackupService } from "./googleDriveBackupService";''',
    '''import { GoogleDriveBackupService } from "./googleDriveBackupService";
import type { GmailBackupService } from "./gmailBackupService";''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  readonly googleDriveBackupService: GoogleDriveBackupService;
}''',
    '''  readonly googleDriveBackupService: GoogleDriveBackupService;
  readonly gmailBackupService: GmailBackupService;
}''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  googleDriveBackupService,
}: RegisterIpcOptions): void {''',
    '''  googleDriveBackupService,
  gmailBackupService,
}: RegisterIpcOptions): void {''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  ipcMain.handle("backup:create", async () => {
    return backupService.createBackup();
  });''',
    '''  ipcMain.handle("backup:create", async () => {
    const result = await backupService.createBackup();
    if (result.success && settingsStore.getSettings().gmailBackupEnabled) {
      const gmailResult = await gmailBackupService.sendLatest();
      if (!gmailResult.ok) {
        console.error("Automatic Gmail backup failed:", gmailResult.error);
      }
    }
    return result;
  });''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  ipcMain.handle("backup:openFolder", async () => {
    return backupService.openFolder();
  });''',
    '''  ipcMain.handle("backup:openFolder", async () => {
    return backupService.openFolder();
  });

  ipcMain.handle("backup:chooseFolder", async (): Promise<BackupLocationResult> => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Choose NASbook backup location",
        properties: ["openDirectory", "createDirectory"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true };
      }
      const selectedPath = path.resolve(result.filePaths[0]);
      settingsStore.updateSettings({ backupDirectory: selectedPath });
      return { ok: true, path: selectedPath };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("backup:resetFolder", async (): Promise<BackupLocationResult> => {
    try {
      settingsStore.updateSettings({ backupDirectory: null });
      return { ok: true, path: backupService.getBackupsFolder() };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });''',
)

replace_once(
    "electron/main/ipc.ts",
    '''  ipcMain.handle("cloudBackup:uploadLatest", async () => {
    return googleDriveBackupService.uploadLatest();
  });''',
    '''  ipcMain.handle("cloudBackup:uploadLatest", async () => {
    return googleDriveBackupService.uploadLatest();
  });

  ipcMain.handle("gmailBackup:getStatus", async () => {
    return gmailBackupService.getStatus();
  });

  ipcMain.handle("gmailBackup:sendLatest", async () => {
    return gmailBackupService.sendLatest();
  });''',
)

replace_once(
    "src/renderer/components/SettingsPanel.tsx",
    '''      await refreshBackup();
      setFeedback({ type: "success", message: c.successBackup });
      if (settings.gmailBackupEnabled) {
        const gmailResult = await window.nasNotesbook.gmailBackup.sendLatest();
        await refreshIntegrations();
        if (!gmailResult.ok) {
          setFeedback({
            type: "error",
            message: `${c.successBackup} ${gmailResult.error || "Gmail backup failed"}`,
          });
        }
      }''',
    '''      await refreshBackup();
      await refreshIntegrations();
      setFeedback({ type: "success", message: c.successBackup });''',
)

replace_once(
    "src/renderer/components/SettingsPanel.tsx",
    '''            <button
              aria-label={c.close}
              className="settings-center-close"''',
    '''            <button
              aria-label={c.close}
              className="settings-center-close"
              data-tooltip={c.close}''',
)

replace_once(
    "tests/database.test.mjs",
    '''    autoBackupEnabled: true,
    backupRetentionCount: 10,
    cloudBackupEnabled: false,
    lastCloudBackupAt: null,
    lastCloudBackupFileName: null,''',
    '''    autoBackupEnabled: true,
    backupRetentionCount: 10,
    backupFrequency: "daily",
    backupDirectory: null,
    cloudBackupEnabled: false,
    lastCloudBackupAt: null,
    lastCloudBackupFileName: null,
    gmailBackupEnabled: false,
    lastGmailBackupAt: null,
    lastGmailBackupFileName: null,''',
)

replace_once(
    "tests/scaffold.test.mjs",
    '''  assert.match(settingsSource, /data-tooltip=\\{t\\("settingsClose",\\s*lang\\)\\}/);''',
    '''  assert.match(settingsSource, /data-tooltip=\\{c\\.close\\}/);''',
)

print("Settings Center backend patch applied.")
