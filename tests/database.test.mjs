import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  schemaStatements,
  seedCategories,
} from "../dist/electron/main/schema.js";
import { hasUnsavedNoteChanges } from "../dist/src/shared/dirtyState.js";

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
});
