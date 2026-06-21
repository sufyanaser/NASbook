import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  schemaStatements,
  seedCategories,
} from "../dist/electron/main/schema.js";
import { hasUnsavedNoteChanges, stripHtmlForPreview } from "../dist/src/shared/dirtyState.js";
import {
  defaultAppSettings,
  getToggledLightDarkTheme,
  isLightLikeTheme,
  normalizeAppSettings,
} from "../dist/src/shared/settings.js";

const expectedCategories = [
  "All Notes",
  "Prompts",
  "ChatGPT Instructions",
  "NAS Projects",
  "PowerShell Commands",
  "Development Notes",
  "Errors & Fixes",
  "Templates",
  "Archive",
  "Trash",
];

test("database schema defines the phase 2 tables", () => {
  const schema = schemaStatements.join("\n");

  for (const table of ["categories", "notes", "tags", "note_tags"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  assert.match(schema, /FOREIGN KEY\(category_id\) REFERENCES categories\(id\)/);
  assert.match(schema, /FOREIGN KEY\(note_id\) REFERENCES notes\(id\)/);
  assert.match(schema, /FOREIGN KEY\(tag_id\) REFERENCES tags\(id\)/);
});

test("database seed data defines the default system categories", () => {
  assert.deepEqual(
    seedCategories.map((category) => category.name),
    expectedCategories,
  );
  assert.equal(
    seedCategories.every((category) => category.isSystem),
    true,
  );
});

test("database module contains basic notes CRUD operations", async () => {
  const source = await readFile(join(process.cwd(), "electron/main/db.ts"), "utf8");

  for (const operation of [
    "createNote",
    "updateNote",
    "listNotes",
    "listTrashNotes",
    "deleteNoteToTrash",
    "restoreNote",
    "deleteNotePermanent",
  ]) {
    assert.match(source, new RegExp(`${operation}:`));
  }

  assert.match(source, /INSERT INTO notes/);
  assert.match(source, /UPDATE notes/);
  assert.match(source, /deleted_at IS NOT NULL/);
  assert.match(source, /deleted_at = NULL/);
  assert.match(source, /DELETE FROM notes WHERE id = \?/);
});

test("dirty-state utility detects changed title or content", () => {
  const note = {
    title: "Original",
    contentMarkdown: "Body",
  };

  assert.equal(hasUnsavedNoteChanges(null, "Any", "Any"), false);
  assert.equal(hasUnsavedNoteChanges(note, "Original", "Body"), false);
  assert.equal(hasUnsavedNoteChanges(note, "Changed", "Body"), true);
  assert.equal(hasUnsavedNoteChanges(note, "Original", "Changed"), true);

  // Semantic equivalency test cases for hasUnsavedNoteChanges
  // 1. Plain text vs paragraph-wrapped HTML
  assert.equal(hasUnsavedNoteChanges(note, "Original", "<p>Body</p>"), false);
  // 2. Semantic spacing and line breaks
  const multilineNote = {
    title: "Multiline",
    contentMarkdown: "Line 1\nLine 2",
  };
  assert.equal(hasUnsavedNoteChanges(multilineNote, "Multiline", "<p>Line 1</p><p>Line 2</p>"), false);
  assert.equal(hasUnsavedNoteChanges(multilineNote, "Multiline", "Line 1<br>Line 2"), false);
  assert.equal(hasUnsavedNoteChanges(multilineNote, "Multiline", "Line 1<br />Line 2"), false);
  // 3. Whitespace collapse and non-breaking space
  const spacesNote = {
    title: "Spaces",
    contentMarkdown: "Hello World",
  };
  assert.equal(hasUnsavedNoteChanges(spacesNote, "Spaces", "Hello&nbsp;World"), false);
  assert.equal(hasUnsavedNoteChanges(spacesNote, "Spaces", "Hello  World"), false);
});

test("stripHtmlForPreview strips tags, decodes entities, and normalizes whitespace", () => {
  // Gracefully handles empty input
  assert.equal(stripHtmlForPreview(""), "");
  assert.equal(stripHtmlForPreview(null), "");
  assert.equal(stripHtmlForPreview(undefined), "");

  // Strips tags
  assert.equal(stripHtmlForPreview("<p>Hello</p>"), "Hello");
  assert.equal(stripHtmlForPreview("<div>Line 1</div><span>Line 2</span>"), "Line 1 Line 2");

  // Decodes common HTML entities
  assert.equal(stripHtmlForPreview("Hello&nbsp;World"), "Hello World");
  assert.equal(stripHtmlForPreview("A&lt;B &amp;&amp; B&gt;C"), "A<B && B>C");
  assert.equal(stripHtmlForPreview("&quot;Hello&#39;s World&quot;"), "\"Hello's World\"");

  // Normalizes excessive whitespace
  assert.equal(stripHtmlForPreview("   Hello    World   "), "Hello World");
  assert.equal(stripHtmlForPreview("<p>  Hello  </p>\n\n<p>  World  </p>"), "Hello World");
});

test("app settings defaults preserve manual-save behavior", () => {
  assert.deepEqual(defaultAppSettings, {
    theme: "dark",
    railIconMode: "colored",
    editorDirection: "auto",
    editorDensity: "comfortable",
    fontSize: "medium",
    showMetadata: true,
    showNotePreview: true,
    showNoteDates: true,
    confirmUnsavedSwitch: true,
    language: "ar",
    autoBackupEnabled: true,
    backupRetentionCount: 10,
    cloudBackupEnabled: false,
    lastCloudBackupAt: null,
    lastCloudBackupFileName: null,
    shortcuts: {
      saveNote: "Ctrl+S",
      newNote: "Ctrl+Alt+N",
      renameNote: "Ctrl+R",
      moveNote: "Ctrl+M",
      deleteNote: "Ctrl+Shift+D",
      saveNasbk: "Ctrl+Shift+S",
      toggleBold: "Ctrl+B",
      toggleItalic: "Ctrl+I",
      toggleUnderline: "Ctrl+U",
      toggleStrike: "Ctrl+Shift+X",
      toggleCode: "Ctrl+E",
      toggleCodeBlock: "Ctrl+Alt+C",
      toggleBulletList: "Ctrl+Shift+8",
      toggleNumberedList: "Ctrl+Shift+9",
      toggleBlockquote: "Ctrl+Shift+Q",
      clearFormatting: "Ctrl+Alt+R",
    },
  });
});

test("app settings validation rejects unsupported values", () => {
  const settings = normalizeAppSettings({
    theme: "broken",
    railIconMode: "adaptive",
    editorDirection: "sideways",
    editorDensity: "wide",
    fontSize: "huge",
    showMetadata: false,
    showNotePreview: "yes",
    showNoteDates: false,
    confirmUnsavedSwitch: false,
    language: "fr",
  });

  assert.equal(settings.theme, "dark");
  assert.equal(settings.railIconMode, "adaptive");
  assert.equal(settings.editorDirection, "auto");
  assert.equal(settings.editorDensity, "wide");
  assert.equal(settings.fontSize, "medium");
  assert.equal(settings.showMetadata, false);
  assert.equal(settings.showNotePreview, true);
  assert.equal(settings.showNoteDates, false);
  assert.equal(settings.confirmUnsavedSwitch, false);
  assert.equal(settings.language, "ar");

  const settingsValid = normalizeAppSettings({
    language: "en",
  });
  assert.equal(settingsValid.language, "en");
});

test("dark light theme toggle treats light-like themes safely", () => {
  assert.equal(isLightLikeTheme("light"), true);
  assert.equal(isLightLikeTheme("ulysses"), true);
  assert.equal(isLightLikeTheme("dark"), false);
  assert.equal(isLightLikeTheme("graphite"), false);
  assert.equal(getToggledLightDarkTheme("light"), "dark");
  assert.equal(getToggledLightDarkTheme("ulysses"), "dark");
  assert.equal(getToggledLightDarkTheme("dark"), "light");
  assert.equal(getToggledLightDarkTheme("material-dark"), "light");
  assert.equal(getToggledLightDarkTheme("one-dark"), "light");
});
