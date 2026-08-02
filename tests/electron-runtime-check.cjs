const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const { createNotesbookDatabase, getDatabasePath } = require("../dist/electron/main/db.js");

const database = new Database(":memory:");
database.exec("CREATE TABLE runtime_check (value TEXT NOT NULL)");
database.prepare("INSERT INTO runtime_check (value) VALUES (?)").run("ready");
const row = database.prepare("SELECT value FROM runtime_check").get();
database.close();

assert.equal(row.value, "ready");

const profilePath = mkdtempSync(path.join(tmpdir(), "nasbook-runtime-check-"));
try {
  let notesbook = createNotesbookDatabase(profilePath);
  const searchable = notesbook.createNote({
    title: "Searchable title",
    contentMarkdown: "Unique broadcast knowledge",
    contentHtml: "<p>Unique <strong>broadcast</strong> knowledge</p>",
    isRtl: false,
  });
  notesbook.createNote({ title: "Unrelated" });

  assert.deepEqual(
    notesbook.listNotes({ searchQuery: "BROADCAST" }).map((note) => note.id),
    [searchable.id],
  );
  assert.deepEqual(
    notesbook.listNotes({ searchQuery: "broadcast" }).map((note) => note.id),
    [searchable.id],
  );
  assert.equal(notesbook.listNotes({ searchQuery: "%" }).length, 0);
  assert.equal(notesbook.getNoteById(searchable.id).contentMarkdown, "Unique broadcast knowledge");
  assert.equal(
    notesbook.getNoteById(searchable.id).contentHtml,
    "<p>Unique <strong>broadcast</strong> knowledge</p>",
  );
  notesbook.close();

  const raw = new Database(getDatabasePath(profilePath));
  raw.prepare("DELETE FROM schema_migrations WHERE id = 2").run();
  raw.prepare("UPDATE notes SET content_markdown = content_html WHERE id = ?").run(searchable.id);
  raw.close();

  notesbook = createNotesbookDatabase(profilePath);
  const migrated = notesbook.getNoteById(searchable.id);
  assert.equal(migrated.contentHtml, "<p>Unique <strong>broadcast</strong> knowledge</p>");
  assert.equal(migrated.contentMarkdown, "Unique **broadcast** knowledge");
  notesbook.close();
} finally {
  const resolvedProfile = path.resolve(profilePath);
  const resolvedTemp = `${path.resolve(tmpdir())}${path.sep}`;
  assert.equal(resolvedProfile.startsWith(resolvedTemp), true);
  rmSync(resolvedProfile, { recursive: true, force: true });
}

console.log(
  JSON.stringify({
    node: process.versions.node,
    modules: process.versions.modules,
    electron: process.versions.electron,
    betterSqlite3: "ready",
    notesSearch: "ready",
    contentMigration: "ready",
  }),
);
