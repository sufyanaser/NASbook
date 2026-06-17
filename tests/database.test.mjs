import assert from "node:assert/strict";
import test from "node:test";
import {
  schemaStatements,
  seedCategories,
} from "../dist/electron/main/schema.js";

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
