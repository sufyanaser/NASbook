import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  schemaStatements,
  seedCategories,
} from "../dist/electron/main/schema.js";
import { hasUnsavedNoteChanges, stripHtmlForPreview } from "../dist/src/shared/dirtyState.js";

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
