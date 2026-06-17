# NAS Notesbook - Phased Implementation Plan

This implementation plan breaks down v1 development into 7 sequential, fully verifiable phases. Each phase delivers only what is listed in the [v1 scope](01_Project_Registry.md#4-v1-scope-minimal)—no cloud sync, no multi-user features, no Notesnook feature parity.

---

## Phase 1: Environment Setup & Scaffolding
**Goal:** Initialize the project workspace, install development packages, and configure building compilers for Vite, React, and Electron.

### Tasks:
1. **Initialize Project & Manifests:**
   *   Create `package.json` with scripts: `dev`, `build`, `preview`.
   *   Configure TypeScript using strict rules: `tsconfig.json`.
2. **Install Key Dependencies:**
   *   **Production dependencies:** `react`, `react-dom`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `better-sqlite3`, `lucide-react`.
   *   **Dev dependencies:** `electron`, `vite`, `vite-plugin-electron`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `electron-builder`.
3. **Configure Tailwind Styles:**
   *   Generate `tailwind.config.js` and `postcss.config.js`.
   *   Create global stylesheet `src/renderer/styles/index.css` supporting standard font bindings and spacing utilities.
4. **Vite Configurations:**
   *   Structure `vite.config.ts` to manage building both Main (`src/main/index.ts`) and Preload (`src/preload/index.ts`) targets alongside compiling the Renderer single-page app.

---

## Phase 2: Local Database & Storage Infrastructure
**Goal:** Implement the SQLite engine, define table schemas, insert system seed categories, and write indexing triggers for search.

### Tasks:
1. **Develop Database Manager (`src/main/db.ts`):**
   *   Import `better-sqlite3`.
   *   Determine application paths dynamically using `electron.app.getPath('userData')`.
   *   Create database helper functions: `init()`, `query()`, `run()`, `transaction()`.
2. **Apply Database Migration & Seed Script:**
   *   Define relational schemas for `categories`, `notes`, `tags`, `note_tags`, and `app_settings`.
   *   Populate system-protected default categories (Prompts, ChatGPT Instructions, NAS Projects, PowerShell Commands, Development Notes, Errors & Fixes, Templates).
3. **Configure Search Optimization (FTS5):**
   *   Initialize `notes_fts` virtual table.
   *   Implement trigger scripts (`notes_ai`, `notes_au`, `notes_ad`) to index note changes automatically without manual programmatic resyncs.

---

## Phase 3: Preload Secure Bridge & IPC Channels
**Goal:** Establish safe security context boundaries using Electron IPC, preventing renderer vulnerabilities while supporting rich database operations.

### Tasks:
1. **Define IPC Channel Handlers (`src/main/ipc.ts`):**
   *   Map database and file-system functions to specific IPC events (see [IPC Design Spec](02_Product_Architecture.md#3-ipc-design-spec)).
   *   Wrap SQLite database queries inside try/catch blocks, returning robust serialized errors.
2. **Develop Preload Script (`src/preload/index.ts`):**
   *   Construct the secure boundaries using `contextBridge.exposeInMainWorld('api', { ... })`.
   *   Ensure no raw database objects or node file modules can be exposed to the window context.

---

## Phase 4: UI/UX Layout Component Scaffolding
**Goal:** Render the primary application viewport with Tailwind interfaces, handling structural spacing and selection states. Layout follows the three-panel Notesnook-inspired structure (layout reference only).

### Tasks:
1. **Build Left Navigation Rail (`src/renderer/components/NavigationRail.tsx`):**
   *   Render default category lists (Prompts, ChatGPT Instructions, NAS Projects, PowerShell Commands, etc.).
   *   Implement selection indicators.
   *   Place Trash toggle and the Settings Gear at the bottom.
2. **Build Middle Notes List Column (`src/renderer/components/NotesListColumn.tsx`):**
   *   Render instant search text input.
   *   Build note selection list cards showing Title, description preview, and short date stamps.
   *   Implement empty states when selection lists are empty.
3. **Build Status Bar (`src/renderer/components/StatusFooter.tsx`):**
   *   Bind indicators for characters count, save statuses, and active orientation properties.

---

## Phase 5: Editor Integration & RTL Mechanics
**Goal:** Wire the Tiptap rich-text workspace with manual and auto-direction triggers. Editor uses full panel width for comfortable prompt writing.

### Tasks:
1. **Initialize Editor Area (`src/renderer/components/NoteEditorArea.tsx`):**
   *   Implement Title text fields, tags manager line, and category selector.
   *   Mount `@tiptap/react` alongside `StarterKit` modules.
   *   Ensure editor surface fills available width (no narrow hard-cap).
2. **Write RTL Direction Script:**
   *   Write the bi-directional character detection utility.
   *   Bind auto-direction checking on editor changes.
   *   Provide manual override toggles in the top formatting toolbar.
   *   Enforce LTR on all code blocks and inline code.
3. **Embed CodeBlock & Copy Tools:**
   *   Add native code block handlers to Tiptap workspace with language label and "Copy Code" button.
   *   Implement "Copy Note Content" and "Copy as ChatGPT Context" XML wrappers.

---

## Phase 6: File I/O, Trash & Local Backup
**Goal:** Support markdown export/import, trash lifecycle, autosave, and simple local backup folder copies.

### Tasks:
1. **File I/O Native Hooks:**
   *   Develop native Windows file dialog controllers using Electron's `dialog.showSaveDialog` (for markdown exports) and `dialog.showOpenDialog` (for markdown imports of `.md` and `.txt`).
2. **Autosave Pipeline:**
   *   Debounce editor changes (1000ms) and persist via `notes:save` IPC.
   *   Update status bar save indicator (`Saving...` → `Saved Local`).
3. **Local Backup Folder:**
   *   Let user pick a writable local folder via `files:selectBackupFolder`.
   *   Store path in `app_settings`.
   *   On manual trigger or post-autosave, copy note Markdown files into category subfolders under the backup path.
   *   No Dropbox, OneDrive, or NAS sync integration—local folder copy only.
4. **Trash Management Lifecycle:**
   *   Establish soft-deletes (`deleted_at` timestamps) via `notes:trash`.
   *   Render warning banners over trashed notes with Restore and Delete Forever actions.
   *   Implement `notes:restore` and `notes:destroy` handlers.

---

## Phase 7: Testing, Optimization, and Build Pipeline
**Goal:** Conduct regression testing against the v1 feature checklist, optimize performance, and build production binary installers.

### Tasks:
1. **v1 Feature Verification:**
   *   Confirm each v1 scope item (create, edit, trash, restore, categories, tags, search, RTL/LTR, rich text, code blocks, copy actions, import/export, autosave, local backup).
   *   Validate RTL-first Arabic rendering and LTR code blocks under mixed-language notes.
2. **Performance Auditing:**
   *   Verify database WAL execution modes.
   *   Inspect interface rendering lag under continuous typing in wide editor layout.
3. **Compile App Build Assemblies:**
   *   Configure `electron-builder.json5`.
   *   Compile Windows executable installers (`.exe`) with the embedded `assets/icon.ico` design.
