import assert from "node:assert/strict";
  import test from "node:test";
  import { createRequire } from "node:module";
  import fs from "node:fs";
  import path from "node:path";
  import os from "node:os";

  const require = createRequire(import.meta.url);
  const Module = require("node:module");
  const originalRequire = Module.prototype.require;

  let safeStorageAvailable = true;

  // Mock electron module
  Module.prototype.require = function (request) {
    if (request === "electron") {
      return {
        shell: {
          openExternal: async () => {},
        },
        safeStorage: {
          isEncryptionAvailable: () => safeStorageAvailable,
          encryptString: (str) => Buffer.from(str),
          decryptString: (buf) => buf.toString(),
        },
      };
    }
    return originalRequire.apply(this, arguments);
  };

  // Now import the service after mocking
  const { createGoogleAuthService, redactSensitive } = await import("../dist/electron/main/googleAuthService.js");

  // Mock SettingsStore
  const createMockSettingsStore = (lang) => ({
    settingsPath: "mock-settings.json",
    getSettings: () => ({ language: lang }),
    updateSettings: () => ({ language: lang }),
  });

  test("token redaction utility works as expected", () => {
    const rawMsg = "Failed with access_token=ya29.1234567890abcdef and refresh_token=1//0987654321fedcba and id_token=xyz";
    const redacted = redactSensitive(rawMsg);
    assert.ok(redacted.includes("access_token=[REDACTED]"));
    assert.ok(redacted.includes("refresh_token=[REDACTED]"));
    assert.ok(redacted.includes("id_token=[REDACTED]"));
    assert.ok(!redacted.includes("ya29.1234567890abcdef"));
    assert.ok(!redacted.includes("1//0987654321fedcba"));

    const authHeader = "Authorization: Bearer ya29.abcdef123456";
    const redactedHeader = redactSensitive(authHeader);
    assert.equal(redactedHeader, "Authorization: Bearer [REDACTED]");
  });

  test("no credentials returns not_configured", async () => {
    // Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env variables are not present for the test
    const oldCid = process.env.GOOGLE_CLIENT_ID;
    const oldSec = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    // Use a unique temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-test-"));
    const settingsStore = createMockSettingsStore("en");

    try {
      const service = createGoogleAuthService(tempDir, settingsStore);
      const status = await service.getStatus();
      
      assert.equal(status.configured, false);
      assert.equal(status.linked, false);
      assert.equal(status.status, "not_configured");
      assert.equal(status.message, "Google credentials not configured");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
      if (oldCid) process.env.GOOGLE_CLIENT_ID = oldCid;
      if (oldSec) process.env.GOOGLE_CLIENT_SECRET = oldSec;
    }
  });

  test("credentials template is not treated as real credentials", async () => {
    const oldCid = process.env.GOOGLE_CLIENT_ID;
    const oldSec = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-test-"));
    const settingsStore = createMockSettingsStore("ar"); // Arabic

    // Write a mock google-credentials.json with placeholders (template values)
    const mockCredentialsPath = path.join(process.cwd(), "google-credentials.json");
    const originalCredentialsExist = fs.existsSync(mockCredentialsPath);
    let originalCredentialsContent = null;
    if (originalCredentialsExist) {
      originalCredentialsContent = fs.readFileSync(mockCredentialsPath, "utf8");
    }

    try {
      fs.writeFileSync(mockCredentialsPath, JSON.stringify({
        client_id: "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
        client_secret: "YOUR_CLIENT_SECRET_HERE"
      }));

      const service = createGoogleAuthService(tempDir, settingsStore);
      const status = await service.getStatus();

      assert.equal(status.configured, false);
      assert.equal(status.status, "not_configured");
      assert.equal(status.message, "لم يتم إعداد بيانات Google"); // Arabic message
    } finally {
      if (originalCredentialsExist && originalCredentialsContent) {
        fs.writeFileSync(mockCredentialsPath, originalCredentialsContent);
      } else {
        fs.rmSync(mockCredentialsPath, { force: true });
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
      if (oldCid) process.env.GOOGLE_CLIENT_ID = oldCid;
      if (oldSec) process.env.GOOGLE_CLIENT_SECRET = oldSec;
    }
  });

  test("unlink without token does not throw and sets state to unlinked", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-test-"));
    const settingsStore = createMockSettingsStore("en");

    try {
      const service = createGoogleAuthService(tempDir, settingsStore);
      
      // Attempt unlink when no session is present
      await assert.doesNotReject(async () => {
        await service.unlink();
      });

      // Status should reflect unlinked (if configured) or not_configured
      const status = await service.getStatus();
      assert.equal(status.linked, false);
      assert.ok(["unlinked", "not_configured"].includes(status.status));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("safeStorage unavailability is handled gracefully", async () => {
    safeStorageAvailable = false; // Turn off mock safeStorage

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nas-notesbook-test-"));
    const settingsStore = createMockSettingsStore("en");

    try {
      const service = createGoogleAuthService(tempDir, settingsStore);
      const status = await service.getStatus();

      assert.equal(status.status, "token_storage_unavailable");
      assert.equal(status.message, "Google token storage unavailable");
      
      // link should return token_storage_unavailable status immediately
      const linkStatus = await service.link();
      assert.equal(linkStatus.status, "token_storage_unavailable");
    } finally {
      safeStorageAvailable = true; // Restore
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
