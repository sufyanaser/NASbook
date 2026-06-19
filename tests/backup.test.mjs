import assert from "node:assert/strict";
import test from "node:test";
import { getLocalDateString, getBackupFilenames, getRetentionActions } from "../dist/electron/main/backupService.js";
import { defaultAppSettings } from "../dist/src/shared/settings.js";

test("backup settings defaults are correct", () => {
  assert.equal(defaultAppSettings.autoBackupEnabled, true);
  assert.equal(defaultAppSettings.backupRetentionCount, 10);
});

test("backup filename generation", () => {
  const names = getBackupFilenames("2026-06-19-032841");
  assert.equal(names.dbFile, "nas-notesbook-backup-2026-06-19-032841.db");
  assert.equal(names.settingsFile, "nas-notesbook-settings-2026-06-19-032841.json");
  assert.equal(names.metaFile, "nas-notesbook-backup-2026-06-19-032841.meta.json");
});

test("backup local date string formatting format", () => {
  const date = new Date(2026, 5, 19, 3, 28, 41); // June is 5 in JS Date
  const res = getLocalDateString(date);
  assert.equal(res.dateStr, "2026-06-19");
  assert.equal(res.timeStr, "032841");
});

test("retention selection logic selects oldest backups for deletion", () => {
  const filenames = [
    "nas-notesbook-backup-2026-06-10-120000.db",
    "nas-notesbook-settings-2026-06-10-120000.json",
    "nas-notesbook-backup-2026-06-10-120000.meta.json",

    "nas-notesbook-backup-2026-06-11-120000.db",
    "nas-notesbook-settings-2026-06-11-120000.json",
    "nas-notesbook-backup-2026-06-11-120000.meta.json",

    "nas-notesbook-backup-2026-06-12-120000.db",
    "nas-notesbook-settings-2026-06-12-120000.json",
    "nas-notesbook-backup-2026-06-12-120000.meta.json",

    "nas-notesbook-backup-2026-06-13-120000.db",
    "nas-notesbook-settings-2026-06-13-120000.json",
    "nas-notesbook-backup-2026-06-13-120000.meta.json",
  ];

  // If retention count is 2, it should keep June 12 and 13, and delete June 10 and 11 files
  const toDelete = getRetentionActions(filenames, 2);
  const expectedToDelete = [
    "nas-notesbook-backup-2026-06-10-120000.db",
    "nas-notesbook-settings-2026-06-10-120000.json",
    "nas-notesbook-backup-2026-06-10-120000.meta.json",
    
    "nas-notesbook-backup-2026-06-11-120000.db",
    "nas-notesbook-settings-2026-06-11-120000.json",
    "nas-notesbook-backup-2026-06-11-120000.meta.json",
  ];

  assert.deepEqual(toDelete.sort(), expectedToDelete.sort());
});

test("retention selection logic keeps all backups if count is within limit", () => {
  const filenames = [
    "nas-notesbook-backup-2026-06-12-120000.db",
    "nas-notesbook-settings-2026-06-12-120000.json",
    "nas-notesbook-backup-2026-06-12-120000.meta.json",

    "nas-notesbook-backup-2026-06-13-120000.db",
    "nas-notesbook-settings-2026-06-13-120000.json",
    "nas-notesbook-backup-2026-06-13-120000.meta.json",
  ];

  const toDelete = getRetentionActions(filenames, 5);
  assert.equal(toDelete.length, 0);
});
