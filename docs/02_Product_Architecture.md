# NAS Notesbook - Product Architecture

This document describes the high-level architecture, subsystem boundaries, data-flow models, database design, and compile pipeline for NAS Notesbook v1—a personal, local-first desktop notebook for SUFYAN's ChatGPT and NAS APP workflow.

---

## 1. Subsystem Decomposition & Boundaries

NAS Notesbook is built using the Electron framework combined with Vite, React, and TypeScript. The application is divided into three distinct runtime layers:

```
+---------------------------------------------------------------------------------+
|                                 RENDERER PROCESS                                |
|                                (React UI Runtime)                               |
|                                                                                 |
|   +---------------------+   +---------------------+   +---------------------+   |
|   |  Tiptap WYSIWYG     |   |   Component State   |   |   Tailwind Theme    |   |
|   +----------+----------+   +----------+----------+   +----------+----------+   |
|              |                         |                         |              |
+--------------v-------------------------v-------------------------v--------------+
                                         |
                                         | Secure IPC Bridge (window.api)
                                         |
+----------------------------------------v----------------------------------------+
|                                 PRELOAD BRIDGE                                  |
|                           (contextIsolated Preload.js)                          |
|                                                                                 |
|   * Restricts renderer access to native APIs.                                   |
|   * Explicit channel mapping for IPC requests.                                  |
+----------------------------------------+----------------------------------------+
                                         |
                                         | ipcRenderer / ipcMain Events
                                         |
+----------------------------------------v----------------------------------------+
|                                  MAIN PROCESS                                   |
|                              (Node.js Native Host)                              |
|                                                                                 |
|   +---------------------+   +---------------------+   +---------------------+   |
|   |  Database (SQLite)  |   | File I/O (MD/TXT)   |   | OS Native Features  |   |
|   +----------+----------+   +----------+----------+   +----------+----------+   |
|              |                         |                         |              |
|              | SQLite queries          | Native fs APIs          | Win32 APIs   |
|              v                         v                         v              |
|       [ storage.db ]            [ backup/export ]         [ assets/icon.ico]    |
+---------------------------------------------------------------------------------+
```

### 1.1 Renderer Process (React, Vite)
- **Role:** Presents the application layout, manages editor interactions, registers input bindings, handles styling, and handles the text direction configurations.
- **Tech Stack:** React 18, TypeScript, Tailwind CSS, Tiptap Editor, Lucide React (icons).
- **Isolation:** Has absolutely no direct access to Node.js APIs (`fs`, `path`, `child_process`, `better-sqlite3`, etc.) to prevent cross-site scripting (XSS) code executions.

### 1.2 Preload Bridge (`preload.ts`)
- **Role:** Exposes safe interface endpoints to the renderer utilizing Electron's `contextBridge.exposeInMainWorld`.
- **Interface Structure:**
  ```typescript
  window.api = {
    notes: {
      getAll: () => Promise<Note[]>,
      getById: (id: number) => Promise<Note>,
      save: (note: Partial<Note>) => Promise<number>,
      trash: (id: number) => Promise<void>,
      restore: (id: number) => Promise<void>,
      destroy: (id: number) => Promise<void>,
      search: (query: string) => Promise<Note[]>,
    },
    categories: {
      getAll: () => Promise<Category[]>,
    },
    tags: {
      getAll: () => Promise<Tag[]>,
    },
    files: {
      exportMarkdown: (title: string, markdown: string) => Promise<boolean>,
      importMarkdown: () => Promise<{ title: string; content: string } | null>,
      selectBackupFolder: () => Promise<string | null>,
      triggerBackup: (folderPath: string) => Promise<boolean>
    }
  }
  ```

### 1.3 Main Process (Electron Native Host)
- **Role:** Spawns native chromium windows, manages lifecycle events, handles database operations, executes file-system exports/imports, and writes local backup copies.
- **Tech Stack:** Electron, Node.js APIs, `better-sqlite3`.

---

## 2. SQLite Database & Storage Engine

Database interactions are managed inside the Main process using the synchronous, ultra-fast `better-sqlite3` library wrapped inside a centralized manager class `DatabaseManager`.

### 2.1 Pragmas and Configuration
To ensure maximum responsiveness and avoid `SQLITE_BUSY` errors on Windows, the database is opened with the following optimization pragmas:
```sql
PRAGMA journal_mode = WAL;         -- Write-Ahead Logging for high concurrency
PRAGMA synchronous = NORMAL;       -- Balances safety and write speed
PRAGMA foreign_keys = ON;          -- Strict data integrity enforcement
PRAGMA busy_timeout = 5000;        -- Prevent instant lock failures
```

### 2.2 Table Schemas & Indexing

#### Database Initialization script:
```sql
-- Categories table setup
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_system BOOLEAN DEFAULT 0
);

-- Notes table setup
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    category_id INTEGER,
    is_rtl BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT DEFAULT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Tags table setup
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Many-to-Many Bridge table
CREATE TABLE IF NOT EXISTS note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- App settings (backup path, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Populate default categories
INSERT OR IGNORE INTO categories (name, slug, icon, is_system) VALUES 
('Prompts', 'prompts', 'message-square-code', 1),
('ChatGPT Instructions', 'chatgpt-instructions', 'shield-alert', 1),
('NAS Projects', 'nas-projects', 'folder-git-2', 1),
('PowerShell Commands', 'powershell-commands', 'terminal', 1),
('Development Notes', 'development-notes', 'code-2', 1),
('Errors & Fixes', 'errors-fixes', 'bug', 1),
('Templates', 'templates', 'layout-template', 1);
```

### 2.3 SQLite FTS5 Full-Text Search Integration
To support instant search across titles and note bodies, an FTS5 virtual table is utilized:

```sql
-- Create FTS5 index table
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id UNINDEXED,
    title,
    content_markdown,
    tags
);

-- Trigger to sync FTS on note insertion
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(id, title, content_markdown, tags)
    VALUES (
        new.id, 
        new.title, 
        new.content_markdown,
        (SELECT group_concat(t.name, ' ') FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = new.id)
    );
END;

-- Trigger to sync FTS on note update
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    UPDATE notes_fts SET 
        title = new.title,
        content_markdown = new.content_markdown,
        tags = (SELECT group_concat(t.name, ' ') FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = new.id)
    WHERE id = new.id;
END;

-- Trigger to sync FTS on note deletion
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
END;
```

---

## 3. IPC Design Spec
The main process and renderer process exchange structured messages using safe `ipcMain.handle` and `ipcRenderer.invoke` structures.

| Channel Name | Params | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `notes:getAll` | None | `Note[]` | Fetches non-deleted, active notes. |
| `notes:getTrash` | None | `Note[]` | Fetches soft-deleted notes (`deleted_at NOT NULL`). |
| `notes:save` | `Partial<Note>` | `number` (id) | Inserts or updates a note; triggers autosave. |
| `notes:trash` | `number` (id) | `void` | Flags note with `deleted_at = NOW`. |
| `notes:restore` | `number` (id) | `void` | Sets `deleted_at = NULL` to restore notes. |
| `notes:destroy` | `number` (id) | `void` | Permanently deletes a note and related tags. |
| `notes:search` | `string` (query) | `Note[]` | Queries FTS5 virtual table. |
| `categories:getAll`| None | `Category[]` | Returns all available categories. |
| `tags:getAll` | None | `Tag[]` | Returns all tags. |
| `files:export` | `string` (title, content) | `boolean` | Save dialog for exporting notes to Markdown. |
| `files:import` | None | `ImportedFile` | Select and parse `.md` / `.txt` file. |
| `files:selectBackupFolder` | None | `string \| null` | Native folder picker for local backup path. |
| `files:triggerBackup` | `string` (folderPath) | `boolean` | Copies notes as Markdown into the backup folder. |

---

## 4. Local-First Offline Design & Data Flow
There are **zero external networks, endpoints, or trackers** inside NAS Notesbook v1.
*   **Initialization:** When the app launches, it checks for `%APPDATA%/NAS Notesbook/storage.db`. If the database file is missing, it dynamically generates folders and executes the SQL schema initialization scripts.
*   **Read Paths:** React components issue asynchronous promises directly to IPC on load, mounting results inside native React state.
*   **Write Paths:** Editor components issue change events directly to the database. There is no in-memory cache layer that can go out-of-sync with physical storage.

---

## 5. Editor Autosave and Trigger Architecture
To prevent any data loss without causing write-blocking interface freezing:
1. **Debounce Handler:** Changes to Note title, tags, or content are handled by a standard React `useDebounce` hook set at a `1000ms` buffer.
2. **Autosave Payload:** When the debouncing timer clears, a save payload containing the state is packaged:
   ```json
   {
     "id": 105,
     "title": "Configuring WSL 2 with Systemd",
     "content_markdown": "# Configuring WSL 2...\n\n...",
     "content_html": "<h1>Configuring WSL 2...</h1>...",
     "is_rtl": false
   }
   ```
3. **Indicator State:** During save pipeline activity, the bottom Status Bar indicates `Saving...`. On success, it smoothly transitions to `Saved Local`.
4. **Optional Backup Hook:** If a local backup folder path is configured, a non-blocking Markdown copy may run after a successful save.

---

## 6. Local Backup Strategy (v1)
v1 backup is intentionally simple: a user-chosen **local folder** on disk.
*   **Folder Selection:** The user picks a writable directory via Electron's native `dialog.showOpenDialog`. The absolute path is stored in the `app_settings` table.
*   **Backup Trigger:** On manual request or after autosave (when a path is set), the main process copies note Markdown files into category subfolders.
*   **Backup File Schema:**
    ```
    Backup-Folder/
    ├── Prompts/
    │   └── 01_ChatGPT_Code_Reviewer.md
    ├── PowerShell Commands/
    │   └── Check_Disk_Usage_Script.md
    └── metadata.json                   # Backup timestamp and file manifest
    ```
*   **Out of v1 scope:** Dropbox, OneDrive, NAS sync APIs, cloud upload, or any network backup integration. The app only writes to a local path the user selects.

---

## 7. Future Extension Readiness (Post-v1)
The following are documented for later phases—not v1 deliverables:
*   **App Lock Protection:** Master-password prompt on activation.
*   **Encrypted Storage Database:** Swap standard SQLite with `better-sqlite3-multiple-ciphers` or `@journeyapps/sqlcipher`.
*   **Attachment Folder:** Local media rendering under `%APPDATA%/NAS Notesbook/attachments/`.
*   **Configurable Editor Width:** Optional max-width setting for users who prefer a narrower reading column.

---

## 8. Build & Compile Setup

The workspace relies on **Electron-builder** inside Vite to bundle the application cleanly.

### Build Config Outline (`electron-builder.json5`):
```json5
{
  "appId": "com.nas.notesbook",
  "productName": "NAS Notesbook",
  "directories": {
    "output": "dist-build"
  },
  "win": {
    "icon": "assets/icon.ico",
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "nsis": {
    "oneClick": true,
    "allowToChangeInstallationDirectory": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "NAS Notesbook"
  }
}
```
All assets are compiled into optimized bundle output targets, ensuring low resource footprints on execution.
