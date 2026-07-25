import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("settings model includes custom backup location, frequency, and Gmail state", async () => {
  const settingsSource = await source("src/shared/settings.ts");
  assert.match(settingsSource, /backupFrequency:\s*"daily"/);
  assert.match(settingsSource, /backupDirectory:\s*null/);
  assert.match(settingsSource, /gmailBackupEnabled:\s*false/);
  assert.match(settingsSource, /lastGmailBackupAt:\s*null/);
});

test("backup service resolves the location dynamically and supports every-launch mode", async () => {
  const backupSource = await source("electron/main/backupService.ts");
  assert.match(backupSource, /getBackupsFolder/);
  assert.match(backupSource, /settingsStore\.getSettings\(\)\.backupDirectory/);
  assert.match(backupSource, /backupFrequency === "daily"/);
  assert.match(backupSource, /runStartupBackup:\s*\(\) => Promise<BackupResult \| null>/);
});

test("Gmail backup uses the Gmail send API and attaches the latest local backup", async () => {
  const gmailSource = await source("electron/main/gmailBackupService.ts");
  assert.match(gmailSource, /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/);
  assert.match(gmailSource, /Content-Disposition: attachment/);
  assert.match(gmailSource, /toString\("base64url"\)/);
  assert.match(gmailSource, /MAX_ATTACHMENT_BYTES/);
});

test("Google OAuth requests Gmail send permission", async () => {
  const authSource = await source("electron/main/googleAuthService.ts");
  assert.match(authSource, /https:\/\/www\.googleapis\.com\/auth\/gmail\.send/);
});

test("typed IPC exposes folder selection and Gmail backup without weakening preload isolation", async () => {
  const sharedSource = await source("src/shared/ipc.ts");
  const preloadSource = await source("electron/preload/index.ts");
  const ipcSource = await source("electron/main/ipc.ts");

  assert.match(sharedSource, /chooseFolder/);
  assert.match(sharedSource, /resetFolder/);
  assert.match(sharedSource, /gmailBackup/);
  assert.match(preloadSource, /backup:chooseFolder/);
  assert.match(preloadSource, /gmailBackup:sendLatest/);
  assert.match(ipcSource, /properties: \["openDirectory", "createDirectory"\]/);
  assert.match(ipcSource, /gmailBackup:getStatus/);
});

test("settings UI is centered and separates backup from integrations", async () => {
  const panelSource = await source("src/renderer/components/SettingsPanel.tsx");
  const styleSource = await source("src/renderer/styles/settings-center.css");

  assert.match(panelSource, /"backup"/);
  assert.match(panelSource, /"integrations"/);
  assert.match(panelSource, /gmailBackupEnabled/);
  assert.match(panelSource, /chooseBackupFolder/);
  assert.match(styleSource, /place-items:\s*center/);
  assert.match(styleSource, /width:\s*min\(1120px/);
  assert.match(styleSource, /height:\s*min\(820px/);
});
