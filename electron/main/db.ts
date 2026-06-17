import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  defaultCategories,
  type CategoryRecord,
} from "../../src/shared/categories";
import type { NoteListItem } from "../../src/shared/ipc";
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
  readonly category_id: number | null;
  readonly is_rtl: 0 | 1;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

export interface NotesbookDatabase {
  readonly databasePath: string;
  readonly listCategories: () => readonly CategoryRecord[];
  readonly listNotes: () => readonly NoteListItem[];
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
    categoryId: row.category_id,
    isRtl: row.is_rtl === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

type SqliteDatabase = InstanceType<typeof Database>;

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
    listNotes: () => {
      const rows = database
        .prepare(
          `SELECT id, title, category_id, is_rtl, created_at, updated_at, deleted_at
           FROM notes
           WHERE deleted_at IS NULL
           ORDER BY updated_at DESC, id DESC`,
        )
        .all() as NoteRow[];

      return rows.map(toNoteListItem);
    },
    close: () => {
      database.close();
    },
  };
}
