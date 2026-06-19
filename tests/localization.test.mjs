import assert from "node:assert/strict";
import test from "node:test";
import { t, getCategoryDisplayName } from "../dist/src/shared/i18n.js";

test("localization t helper translates keys correctly", () => {
  // Test Arabic translation
  assert.equal(t("notesListTitle", "ar"), "الملاحظات");
  assert.equal(t("newNote", "ar"), "ملاحظة جديدة");
  assert.equal(t("saved", "ar"), "تم الحفظ");
  assert.equal(t("tooltipFontFamily", "ar"), "عائلة الخط");

  // Test English translation
  assert.equal(t("notesListTitle", "en"), "Notes");
  assert.equal(t("newNote", "en"), "New Note");
  assert.equal(t("saved", "en"), "Saved");
  assert.equal(t("tooltipFontFamily", "en"), "Font Family");
});

test("localization t helper handles fallbacks", () => {
  // If an invalid language is supplied, it should fall back to English dictionary
  assert.equal(t("notesListTitle", "fr"), "Notes");
});

test("category display names translate correctly", () => {
  // Arabic system category translations
  assert.equal(getCategoryDisplayName("all-notes", "All Notes", "ar"), "كل الملاحظات");
  assert.equal(getCategoryDisplayName("prompts", "Projects", "ar"), "المشاريع");
  assert.equal(getCategoryDisplayName("trash", "Trash", "ar"), "سلة المهملات");

  // English system category translations
  assert.equal(getCategoryDisplayName("all-notes", "All Notes", "en"), "All Notes");
  assert.equal(getCategoryDisplayName("prompts", "Projects", "en"), "Projects");
  assert.equal(getCategoryDisplayName("trash", "Trash", "en"), "Trash");

  // Non-system / custom category preservation
  assert.equal(getCategoryDisplayName("my-custom-category", "My Custom Category", "ar"), "My Custom Category");
  assert.equal(getCategoryDisplayName("my-custom-category", "My Custom Category", "en"), "My Custom Category");
});
