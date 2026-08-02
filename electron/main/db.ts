import Database from "better-sqlite3";
import TurndownService from "turndown";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import {
  defaultCategories,
  type CategoryRecord,
} from "../../src/shared/categories";
import type {
  CreateNoteInput,
  NoteListItem,
  NoteListOptions,
  NoteRecord,
  UpdateNoteInput,
  UpdateCategoryInput,
} from "../../src/shared/ipc";
import {
  customizableCategorySlugs,
  isCategoryIconKey,
} from "../../src/shared/categoryIcons";
import { schemaStatements, seedCategories } from "./schema";

const DATABASE_BACKUP_LIMIT = 7;
const MAX_SEARCH_QUERY_LENGTH = 200;
const LEGACY_HTML_PATTERN = /<\/?[a-z][\s\S]*>/iu;
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

const nasDebugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NAS_DEBUG_STORAGE === "1") {
    console.log(message, ...args);
  }
};

interface CategoryRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly icon: string;
  readonly is_system: 0 | 1;
}

interface NoteRow {
  readonly id: number;
  readonly title: string;
  readonly content_markdown: string;
  readonly content_html: string;
  readonly category_id: number | null;
  readonly is_rtl: 0 | 1;
  readonly is_locked: 0 | 1;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

interface IntegrityCheckRow {
  readonly integrity_check: string;
}

export interface NotesbookDatabase {
  readonly databasePath: string;
  readonly listCategories: () => readonly CategoryRecord[];
  readonly updateCategory: (input: UpdateCategoryInput) => CategoryRecord;
  readonly listNotes: (options?: NoteListOptions) => readonly NoteListItem[];
  readonly listTrashNotes: () => readonly NoteListItem[];
  readonly getNoteById: (id: number) => NoteRecord | null;
  readonly createNote: (input?: CreateNoteInput) => NoteRecord;
  readonly updateNote: (input: UpdateNoteInput) => NoteRecord;
  readonly setNoteLocked: (id: number, isLocked: boolean) => NoteRecord;
  readonly deleteNoteToTrash: (id: number) => void;
  readonly restoreNote: (id: number) => void;
  readonly deleteNotePermanent: (id: number) => void;
  readonly checkpoint?: () => void;
  readonly close: () => void;
}

function toCategoryRecord(row: CategoryRow): CategoryRecord {
  const fallback = defaultCategories.find((category) => category.slug === row.slug);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug as CategoryRecord["slug"],
    icon: row.icon,
    isSystem: row.is_system === 1,
    placement: fallback?.placement ?? "primary",
  };
}

function toNoteListItem(row: NoteRow): NoteListItem {
  return {
    id: row.id,
    title: row.title,
    preview: row.content_html.slice(0, 120),
    categoryId: row.category_id,
    isRtl: row.is_rtl === 1,
    isLocked: row.is_locked === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toNoteRecord(row: NoteRow): NoteRecord {
  return {
    ...toNoteListItem(row),
    contentMarkdown: row.content_markdown,
    contentHtml: row.content_html,
  };
}

type SqliteDatabase = InstanceType<typeof Database>;

function normalizeTitle(title: string | undefined): string {
  const trimmed = title?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "Untitled Note";
}

function normalizeId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid note id.");
  }

  return id;
}

function normalizeCategoryId(categoryId: number | null | undefined): number | null {
  if (categoryId === null || categoryId === undefined) {
    return null;
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Invalid category id.");
  }

  return categoryId;
}

function normalizeSearchQuery(query: string | undefined): string {
  return (query ?? "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

function toLikePattern(query: string): string {
  const escaped = query.toLocaleLowerCase().replace(/[\\%_]/gu, "\\$&");
  return `%${escaped}%`;
}

function requireCategory(database: SqliteDatabase, id: number): CategoryRecord {
  const row = database
    .prepare(
      `SELECT id, name, slug, icon, is_system
       FROM categories
       WHERE id = ?`,
    )
    .get(normalizeId(id)) as CategoryRow | undefined;

  if (!row) {
    throw new Error("Category not found.");
  }

  return toCategoryRecord(row);
}

function normalizeCategoryName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.length > 40) {
    throw new Error("Category name must contain 1 to 40 characters.");
  }
  return normalized;
}

function requireNote(database: SqliteDatabase, id: number): NoteRecord {
  const row = database
    .prepare(
      `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
              created_at, updated_at, deleted_at
       FROM notes
       WHERE id = ?`,
    )
    .get(id) as NoteRow | undefined;

  if (!row) {
    throw new Error("Note not found.");
  }

  return toNoteRecord(row);
}

function applyInitialMigration(database: SqliteDatabase): void {
  const migrationExists = database
    .prepare("SELECT 1 FROM schema_migrations WHERE id = ?")
    .get(1);

  if (migrationExists) {
    return;
  }

  const migrate = database.transaction(() => {
    for (const statement of schemaStatements) {
      database.prepare(statement).run();
    }

    const insertCategory = database.prepare(`
      INSERT OR IGNORE INTO categories (name, slug, icon, is_system)
      VALUES (@name, @slug, @icon, 1)
    `);

    for (const category of seedCategories) {
      insertCategory.run({
        name: category.name,
        slug: category.slug,
        icon: category.icon,
      });
    }

    database
      .prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)")
      .run(1, "initial-local-data-layer");
  });

  migrate();
}

function ensureDatabaseReady(database: SqliteDatabase): void {
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  for (const statement of schemaStatements) {
    database.prepare(statement).run();
  }

  applyInitialMigration(database);

  const noteColumns = database.pragma("table_info(notes)") as Array<{ name: string }>;
  if (!noteColumns.some((column) => column.name === "is_locked")) {
    database.prepare(
      "ALTER TABLE notes ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1))",
    ).run();
  }

  migrateLegacyHtmlContent(database);
}

function migrateLegacyHtmlContent(database: SqliteDatabase): void {
  const migrationExists = database
    .prepare("SELECT 1 FROM schema_migrations WHERE id = ?")
    .get(2);
  if (migrationExists) {
    return;
  }

  const migrate = database.transaction(() => {
    const rows = database
      .prepare("SELECT id, content_markdown, content_html FROM notes")
      .all() as Pick<NoteRow, "id" | "content_markdown" | "content_html">[];
    const update = database.prepare(
      "UPDATE notes SET content_markdown = ?, content_html = ? WHERE id = ?",
    );

    for (const row of rows) {
      const html = row.content_html || row.content_markdown;
      const markdown = LEGACY_HTML_PATTERN.test(row.content_markdown)
        ? turndown.turndown(html)
        : row.content_markdown;
      update.run(markdown, html, row.id);
    }

    database
      .prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)")
      .run(2, "separate-html-and-markdown-content");
  });
  migrate();
}

function verifyDatabaseIntegrity(database: SqliteDatabase): void {
  const rows = database.pragma("integrity_check") as IntegrityCheckRow[];
  const isHealthy =
    rows.length === 1 && rows[0]?.integrity_check.toLowerCase() === "ok";

  if (!isHealthy) {
    const details = rows.map((row) => row.integrity_check).join("; ");
    throw new Error(`SQLite integrity check failed: ${details || "unknown error"}`);
  }
}

function getBackupDirectory(userDataPath: string): string {
  return path.join(userDataPath, "database-backups");
}

function getBackupFilename(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `storage-${timestamp}.db`;
}

function pruneDatabaseBackups(backupDirectory: string): void {
  const backups = readdirSync(backupDirectory)
    .filter((filename) => /^storage-.*\.db$/u.test(filename))
    .map((filename) => {
      const filePath = path.join(backupDirectory, filename);
      return {
        filePath,
        modifiedAt: statSync(filePath).mtimeMs,
      };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  for (const backup of backups.slice(DATABASE_BACKUP_LIMIT)) {
    unlinkSync(backup.filePath);
  }
}

function createDatabaseBackup(
  databasePath: string,
  userDataPath: string,
): string | null {
  if (!existsSync(databasePath)) {
    return null;
  }

  const backupDirectory = getBackupDirectory(userDataPath);
  mkdirSync(backupDirectory, { recursive: true });

  const backupPath = path.join(backupDirectory, getBackupFilename());
  copyFileSync(databasePath, backupPath);
  pruneDatabaseBackups(backupDirectory);

  return backupPath;
}

export function getDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, "storage.db");
}

export function createNotesbookDatabase(userDataPath: string): NotesbookDatabase {
  mkdirSync(userDataPath, { recursive: true });

  const databasePath = getDatabasePath(userDataPath);
  const database = new Database(databasePath);
  ensureDatabaseReady(database);
  verifyDatabaseIntegrity(database);

  let isClosed = false;

  return {
    databasePath,
    listCategories: () => {
      const rows = database
        .prepare(
          `SELECT id, name, slug, icon, is_system
           FROM categories
           ORDER BY id ASC`,
        )
        .all() as CategoryRow[];

      return rows.map(toCategoryRecord);
    },
    updateCategory: (input) => {
      const category = requireCategory(database, input.id);

      const customizable = customizableCategorySlugs.some(
        (slug) => slug === category.slug,
      );
      if (!customizable) {
        throw new Error("This system category cannot be customized.");
      }

      if (!isCategoryIconKey(input.icon)) {
        throw new Error("Invalid category icon.");
      }

      database
        .prepare("UPDATE categories SET name = ?, icon = ? WHERE id = ?")
        .run(normalizeCategoryName(input.name), input.icon, category.id);

      return requireCategory(database, category.id);
    },
    listNotes: (options) => {
      return createNoteListQuery(database, options ?? {});
    },
    listTrashNotes: () => {
      return createNoteListQuery(database, { includeTrash: true });
    },
    getNoteById: (id) => {
      const row = database
        .prepare(
          `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
                  created_at, updated_at, deleted_at
           FROM notes
           WHERE id = ?`,
        )
        .get(normalizeId(id)) as NoteRow | undefined;

      return row ? toNoteRecord(row) : null;
    },
    createNote: (input) => {
      const title = normalizeTitle(input?.title);
      const contentMarkdown = input?.contentMarkdown ?? "";
      const contentHtml = input?.contentHtml ?? contentMarkdown;
      const categoryId = normalizeCategoryId(input?.categoryId);
      const isRtl = input?.isRtl ?? true;
      const result = database
        .prepare(
          `INSERT INTO notes (
             title, content_markdown, content_html, category_id, is_rtl
           )
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(title, contentMarkdown, contentHtml, categoryId, isRtl ? 1 : 0);

      return requireNote(database, Number(result.lastInsertRowid));
    },
    updateNote: (input) => {
      const id = normalizeId(input.id);
      const current = requireNote(database, id);
      if (current.isLocked) {
        throw new Error("Locked notes are read-only. Unlock the note before editing.");
      }
      nasDebugLog("[TRACE] DB updateNote START", {
        reason: "db",
        noteId: id,
        selectedNoteId: id,
        title: input.title,
        contentMarkdownLength: input.contentMarkdown?.length,
      });
      database
        .prepare(
          `UPDATE notes
           SET title = ?,
               content_markdown = ?,
               content_html = ?,
               category_id = ?,
               is_rtl = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?`,
        )
        .run(
          normalizeTitle(input.title),
          input.contentMarkdown,
          input.contentHtml,
          normalizeCategoryId(input.categoryId),
          input.isRtl ? 1 : 0,
          id,
        );

      const result = requireNote(database, id);
      nasDebugLog("[TRACE] DB updateNote END", {
        reason: "db",
        noteId: result.id,
        selectedNoteId: result.id,
        savedContentLength: result.contentMarkdown?.length,
      });
      return result;
    },
    setNoteLocked: (id, isLocked) => {
      const normalizedId = normalizeId(id);
      database
        .prepare(
          `UPDATE notes
           SET is_locked = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?`,
        )
        .run(isLocked ? 1 : 0, normalizedId);
      return requireNote(database, normalizedId);
    },
    deleteNoteToTrash: (id) => {
      const note = requireNote(database, normalizeId(id));
      if (note.isLocked) {
        throw new Error("Locked notes cannot be moved to Trash.");
      }
      database
        .prepare(
          `UPDATE notes
           SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?`,
        )
        .run(normalizeId(id));
    },
    restoreNote: (id) => {
      database
        .prepare(
          `UPDATE notes
           SET deleted_at = NULL,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?`,
        )
        .run(normalizeId(id));
    },
    deleteNotePermanent: (id) => {
      const note = requireNote(database, normalizeId(id));
      if (note.isLocked) {
        throw new Error("Locked notes cannot be permanently deleted.");
      }
      database.prepare("DELETE FROM notes WHERE id = ?").run(normalizeId(id));
    },
    checkpoint: () => {
      database.pragma("wal_checkpoint(TRUNCATE)");
    },
    close: () => {
      if (isClosed) {
        return;
      }

      isClosed = true;
      database.pragma("wal_checkpoint(TRUNCATE)");
      database.close();

      try {
        const backupPath = createDatabaseBackup(databasePath, userDataPath);
        nasDebugLog("[TRACE] DB backup created", { backupPath });
      } catch (error) {
        console.error("Failed to create NASbook database backup:", error);
      }
    },
  };
}

function createNoteListQuery(
  database: SqliteDatabase,
  options: NoteListOptions,
): readonly NoteListItem[] {
  const categoryId = normalizeCategoryId(options.categoryId);
  const searchQuery = normalizeSearchQuery(options.searchQuery);
  const searchPattern = toLikePattern(searchQuery);

  if (searchQuery !== "") {
    const deletedPredicate = options.includeTrash
      ? "deleted_at IS NOT NULL"
      : "deleted_at IS NULL";
    const rows = database
      .prepare(
        `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
                created_at, updated_at, deleted_at
         FROM notes
         WHERE ${deletedPredicate}
           AND (
             lower(title) LIKE ? ESCAPE '\\'
             OR lower(content_markdown) LIKE ? ESCAPE '\\'
             OR lower(content_html) LIKE ? ESCAPE '\\'
           )
         ORDER BY updated_at DESC, id DESC`,
      )
      .all(searchPattern, searchPattern, searchPattern) as NoteRow[];
    return rows.map(toNoteListItem);
  }

  if (options.includeTrash) {
    const rows = database
      .prepare(
        `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
                created_at, updated_at, deleted_at
         FROM notes
         WHERE deleted_at IS NOT NULL
         ORDER BY updated_at DESC, id DESC`,
      )
      .all() as NoteRow[];

    return rows.map(toNoteListItem);
  }

  if (categoryId !== null) {
    const rows = database
      .prepare(
        `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
                created_at, updated_at, deleted_at
         FROM notes
         WHERE deleted_at IS NULL AND category_id = ?
         ORDER BY updated_at DESC, id DESC`,
      )
      .all(categoryId) as NoteRow[];

    return rows.map(toNoteListItem);
  }

  const rows = database
    .prepare(
      `SELECT id, title, content_markdown, content_html, category_id, is_rtl, is_locked,
              created_at, updated_at, deleted_at
       FROM notes
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC, id DESC`,
    )
    .all() as NoteRow[];

  return rows.map(toNoteListItem);
}
