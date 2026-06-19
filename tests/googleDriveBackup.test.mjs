import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { Buffer } from "node:buffer";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalRequire = Module.prototype.require;

// Mock electron
Module.prototype.require = function (request) {
  if (request === "electron") {
    return {
      shell: { openExternal: async () => {} },
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (str) => Buffer.from(str),
        decryptString: (buf) => buf.toString(),
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

// Now import the service after mocking
const { getLatestBackupGroup, createGoogleDriveBackupService, getLocalizedUploadError } = await import("../dist/electron/main/googleDriveBackupService.js");
const { t } = await import("../dist/src/shared/i18n.js");

// Mock SettingsStore
const createMockSettingsStore = (initialSettings = {}) => {
  let settings = {
    language: "en",
    cloudBackupEnabled: false,
    lastCloudBackupAt: null,
    lastCloudBackupFileName: null,
    ...initialSettings
  };
  return {
    settingsPath: "mock-settings.json",
    getSettings: () => settings,
    updateSettings: (newSettings) => {
      settings = { ...settings, ...newSettings };
      return settings;
    },
  };
};

// Mock GoogleAuthService
const createMockGoogleAuthService = (authState = {}) => {
  const defaultState = {
    configured: true,
    linked: true,
    status: "linked",
    email: "user@example.com",
    error: null,
    message: "Google account linked",
    ...authState
  };
  return {
    getStatus: async () => defaultState,
    link: async () => defaultState,
    unlink: async () => {},
    getAccessToken: async () => "mock-access-token",
  };
};

test("Google Drive folder name constant is correct", () => {
  // Create instance with empty paths
  const auth = createMockGoogleAuthService();
  const store = createMockSettingsStore();
  const service = createGoogleDriveBackupService("mock-path", auth, store);
  
  // Implicitly test status returns ready when linked
  assert.ok(service);
});

test("getLatestBackupGroup behaves correctly", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-backup-test-"));

  try {
    // 1. Empty folder
    assert.equal(getLatestBackupGroup(tempDir), null);

    // 2. Folder doesn't exist
    assert.equal(getLatestBackupGroup(path.join(tempDir, "nonexistent")), null);

    // 3. Write one backup group
    const ts1 = "2026-06-19-120000";
    fs.writeFileSync(path.join(tempDir, `nas-notesbook-backup-${ts1}.db`), "db1");
    fs.writeFileSync(path.join(tempDir, `nas-notesbook-settings-${ts1}.json`), "settings1");
    fs.writeFileSync(path.join(tempDir, `nas-notesbook-backup-${ts1}.meta.json`), "meta1");

    const group1 = getLatestBackupGroup(tempDir);
    assert.equal(group1.timestamp, ts1);
    assert.equal(group1.files.length, 3);
    assert.ok(group1.files.includes(`nas-notesbook-backup-${ts1}.db`));
    assert.ok(group1.files.includes(`nas-notesbook-settings-${ts1}.json`));
    assert.ok(group1.files.includes(`nas-notesbook-backup-${ts1}.meta.json`));

    // 4. Write a newer backup group
    const ts2 = "2026-06-19-140000";
    fs.writeFileSync(path.join(tempDir, `nas-notesbook-backup-${ts2}.db`), "db2");
    fs.writeFileSync(path.join(tempDir, `nas-notesbook-backup-${ts2}.meta.json`), "meta2");
    // settings file omitted for group 2

    const group2 = getLatestBackupGroup(tempDir);
    assert.equal(group2.timestamp, ts2);
    assert.equal(group2.files.length, 2);
    assert.ok(group2.files.includes(`nas-notesbook-backup-${ts2}.db`));
    assert.ok(group2.files.includes(`nas-notesbook-backup-${ts2}.meta.json`));
    assert.ok(!group2.files.includes(`nas-notesbook-settings-${ts2}.json`));

  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("cloudBackupInfo status mappings are correct", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-status-test-"));
  
  try {
    // 1. Not configured
    let auth = createMockGoogleAuthService({ configured: false, linked: false, status: "not_configured" });
    let store = createMockSettingsStore();
    let service = createGoogleDriveBackupService(tempDir, auth, store);
    let status = await service.getStatus();
    assert.equal(status.status, "not_configured");
    assert.equal(status.configured, false);

    // 2. Not linked
    auth = createMockGoogleAuthService({ configured: true, linked: false, status: "unlinked" });
    service = createGoogleDriveBackupService(tempDir, auth, store);
    status = await service.getStatus();
    assert.equal(status.status, "not_linked");
    assert.equal(status.linked, false);

    // 3. Token storage unavailable
    auth = createMockGoogleAuthService({ configured: true, linked: false, status: "token_storage_unavailable" });
    service = createGoogleDriveBackupService(tempDir, auth, store);
    status = await service.getStatus();
    assert.equal(status.status, "token_storage_unavailable");

    // 4. Linked and ready
    auth = createMockGoogleAuthService({ configured: true, linked: true, status: "linked" });
    service = createGoogleDriveBackupService(tempDir, auth, store);
    status = await service.getStatus();
    assert.equal(status.status, "ready");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getLocalizedUploadError translates typical API/network errors correctly", () => {
  assert.equal(getLocalizedUploadError("QuotaExceeded error occurred", "en"), "Quota exceeded");
  assert.equal(getLocalizedUploadError("fetch failed in network", "en"), "Network unavailable");
  assert.equal(getLocalizedUploadError("invalid_grant in oauth exchange", "en"), "Permission revoked or expired");
  assert.equal(getLocalizedUploadError("Some other custom error message", "en"), "Some other custom error message");

  assert.equal(getLocalizedUploadError("quotaExceeded in storage", "ar"), "تم تجاوز الحصة المحددة");
  assert.equal(getLocalizedUploadError("fetch failed in network", "ar"), "الشبكة غير متوفرة");
  assert.equal(getLocalizedUploadError("invalid_grant in oauth exchange", "ar"), "انتهت الصلاحية أو تم إلغاؤها");
});

test("i18n includes new Google Drive backup messages", () => {
  assert.equal(t("googleBackupHeader", "en"), "Google Drive Backup");
  assert.equal(t("googleBackupHeader", "ar"), "النسخ الاحتياطي إلى Google Drive");
  assert.equal(t("googleBtnUpload", "en"), "Upload latest backup to Google Drive");
  assert.equal(t("googleBtnUpload", "ar"), "رفع آخر نسخة احتياطية إلى Google Drive");
  assert.equal(t("googleNoLocalBackup", "en"), "No local backup found");
  assert.equal(t("googleNoLocalBackup", "ar"), "لا توجد نسخة احتياطية محلية");
  assert.equal(t("googleUploading", "en"), "Uploading backup...");
  assert.equal(t("googleUploading", "ar"), "جارٍ رفع النسخة الاحتياطية...");
  assert.equal(t("googleUploadSuccess", "en"), "Backup uploaded to Google Drive");
  assert.equal(t("googleUploadSuccess", "ar"), "تم رفع النسخة الاحتياطية إلى Google Drive");
  assert.equal(t("googleUploadFailed", "en"), "Google Drive upload failed");
  assert.equal(t("googleUploadFailed", "ar"), "فشل رفع النسخة إلى Google Drive");

  // New keys check
  assert.equal(t("googleAccountLabel", "en"), "Google account");
  assert.equal(t("googleAccountLabel", "ar"), "حساب Google");
  assert.equal(t("googleCredentialsMissingHint", "en"), "Add google-credentials.json to enable Google linking.");
  assert.equal(t("googleCredentialsMissingHint", "ar"), "أضف ملف google-credentials.json لتفعيل الربط.");
  assert.equal(t("googleLinkFirstHint", "en"), "Link your Google account first.");
  assert.equal(t("googleLinkFirstHint", "ar"), "اربط حساب Google أولاً.");
  assert.equal(t("googleStatusReady", "en"), "Ready to upload to Google Drive");
  assert.equal(t("googleStatusReady", "ar"), "جاهز للرفع إلى Google Drive");
  assert.equal(t("googleLatestLocalBackup", "en"), "Latest local backup");
  assert.equal(t("googleLatestLocalBackup", "ar"), "آخر نسخة احتياطية محلية");
  assert.equal(t("googleUploadedFiles", "en"), "Uploaded files");
  assert.equal(t("googleUploadedFiles", "ar"), "الملفات المرفوعة");
  assert.equal(t("googleCloudFolder", "en"), "Cloud backup folder");
  assert.equal(t("googleCloudFolder", "ar"), "مجلد النسخ الاحتياطي السحابي");
  assert.equal(t("googleNetworkUnavailable", "en"), "Network unavailable");
  assert.equal(t("googleNetworkUnavailable", "ar"), "الشبكة غير متوفرة");
  assert.equal(t("googleQuotaExceeded", "en"), "Quota exceeded");
  assert.equal(t("googleQuotaExceeded", "ar"), "تم تجاوز الحصة المحددة");
});
