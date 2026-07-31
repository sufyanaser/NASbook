import { defaultCategories } from "../../src/shared/categories";

export const categoryIcons: Record<string, string> = {
  "all-notes": "notebook-tabs",
  prompts: "message-square-code",
  "chatgpt-instructions": "shield-alert",
  "nas-projects": "folder-git-2",
  "powershell-commands": "terminal",
  "development-notes": "code-2",
  "errors-fixes": "bug",
  templates: "layout-template",
  archive: "archive",
  trash: "trash-2",
};

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT '',
    is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1))
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content_markdown TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    category_id INTEGER,
    is_rtl INTEGER NOT NULL DEFAULT 1 CHECK (is_rtl IN (0, 1)),
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT DEFAULT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
] as const;

export const seedCategories = defaultCategories.map((category) => ({
  name: category.name,
  slug: category.slug,
  icon: categoryIcons[category.slug] ?? "",
  isSystem: true,
}));
