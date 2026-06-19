import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
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
} from "../../src/shared/ipc";
import { schemaStatements, seedCategories } from "./schema";

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
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

export interface NotesbookDatabase {
  readonly databasePath: string;
  readonly listCategories: () => readonly CategoryRecord[];
  readonly listNotes: (options?: NoteListOptions) => readonly NoteListItem[];
  readonly listTrashNotes: () => readonly NoteListItem[];
  readonly getNoteById: (id: number) => NoteRecord | null;
  readonly createNote: (input?: CreateNoteInput) => NoteRecord;
  readonly updateNote: (input: UpdateNoteInput) => NoteRecord;
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
    preview: row.content_markdown.slice(0, 120),
    categoryId: row.category_id,
    isRtl: row.is_rtl === 1,
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

function requireNote(database: SqliteDatabase, id: number): NoteRecord {
  const row = database
    .prepare(
      `SELECT id, title, content_markdown, content_html, category_id, is_rtl,
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
}

export function getDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, "storage.db");
}

export function createNotesbookDatabase(userDataPath: string): NotesbookDatabase {
  mkdirSync(userDataPath, { recursive: true });

  const databasePath = getDatabasePath(userDataPath);
  const database = new Database(databasePath);
  ensureDatabaseReady(database);

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
    listNotes: (options) => {
      return createNoteListQuery(database, options ?? {});
    },
    listTrashNotes: () => {
      return createNoteListQuery(database, { includeTrash: true });
    },
    getNoteById: (id) => {
      const row = database
        .prepare(
          `SELECT id, title, content_markdown, content_html, category_id, is_rtl,
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
      const categoryId = normalizeCategoryId(input?.categoryId);
      const isRtl = input?.isRtl ?? true;
      const result = database
        .prepare(
          `INSERT INTO notes (
             title, content_markdown, content_html, category_id, is_rtl
           )
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(title, contentMarkdown, contentMarkdown, categoryId, isRtl ? 1 : 0);

      return requireNote(database, Number(result.lastInsertRowid));
    },
    updateNote: (input) => {
      const id = normalizeId(input.id);
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
          input.contentMarkdown,
          normalizeCategoryId(input.categoryId),
          input.isRtl ? 1 : 0,
          id,
        );

      return requireNote(database, id);
    },
    deleteNoteToTrash: (id) => {
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
      database.prepare("DELETE FROM notes WHERE id = ?").run(normalizeId(id));
    },
    checkpoint: () => {
      database.pragma("wal_checkpoint(TRUNCATE)");
    },
    close: () => {
      database.close();
    },
  };
}

function createNoteListQuery(
  database: SqliteDatabase,
  options: NoteListOptions,
): readonly NoteListItem[] {
  const categoryId = normalizeCategoryId(options.categoryId);

  if (options.includeTrash) {
    const rows = database
      .prepare(
        `SELECT id, title, content_markdown, content_html, category_id, is_rtl,
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
        `SELECT id, title, content_markdown, content_html, category_id, is_rtl,
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
      `SELECT id, title, content_markdown, content_html, category_id, is_rtl,
              created_at, updated_at, deleted_at
       FROM notes
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC, id DESC`,
    )
    .all() as NoteRow[];

  return rows.map(toNoteListItem);
}
