# NAS Notesbook 📔

Current release: **V05**

NAS Notesbook is **SUFYAN's personal**, **RTL-first, local-first** desktop notebook for ChatGPT prompts, NAS APP project contexts, PowerShell commands, and development notes. Built on Windows using Electron, Vite, React, and SQLite, it runs fully offline as a fast, lightweight writing and reference tool.

v1 is intentionally minimal and personal—not a generic note app for IT admins or general users.

---

## v1 Features

| Capability | Included |
| :--- | :---: |
| Create / edit notes | ✓ |
| Delete to Trash / restore | ✓ |
| Categories & tags | ✓ |
| FTS5 search | ✓ |
| RTL/LTR handling (RTL-first) | ✓ |
| Rich text editor (Tiptap) | ✓ |
| Collapsible heading sections | ✓ |
| Read-only edit lock | ✓ |
| 16 fill colors with automatic contrast | ✓ |
| Code blocks (always LTR) | ✓ |
| Copy note content | ✓ |
| Copy as ChatGPT context | ✓ |
| Import `.md` / `.txt` | ✓ |
| Export Markdown | ✓ |
| Autosave | ✓ |
| Local backup folder | ✓ |
| Google Drive backup (optional) | ✓ |

**Not in v1:** automatic real-time cloud sync (Dropbox, OneDrive, NAS sync), Gmail/email backup, restore-from-cloud, multi-device database merge, multi-user support, attachments, encryption, or Notesnook feature parity. Google Drive backup is manual-only and requires a local OAuth configuration.

---

## Highlights

*   **RTL-First Editing:** Arabic-first rendering with auto bi-directional block alignment and manual direction overrides. Code blocks and scripts always stay strict LTR.
*   **Workflow Categories:** Prompts, ChatGPT Instructions, NAS Projects, PowerShell Commands, Development Notes, Errors & Fixes, and Templates.
*   **Local-First:** Notes and tags live in a local SQLite database. No accounts, telemetry, or network dependencies.
*   **ChatGPT Copy Commands:**
    *   **Copy Note Content** — clean text or markdown.
    *   **Copy as ChatGPT Context** — wraps notes in an XML block for model prompts:
        ```xml
        <context name="Note Title">
        Note Markdown Content Here
        </context>
        ```
*   **Comfortable Editor Width:** Full panel width for long prompts and technical notes (no narrow hard-cap in v1).
*   **Simple Local Backup:** Copy notes as Markdown into a user-chosen local folder. No cloud sync integration.
*   **Google Drive Backup (v0.3.0):** Optional manual backup upload using a local OAuth configuration. Credentials and session tokens are encrypted and stored locally; they are never bundled with the installer. For configuration steps, see [Google_Credentials_Setup.md](docs/Google_Credentials_Setup.md).

---

## Technology Stack

*   **Runtime Framework:** [Electron](https://www.electronjs.org/)
*   **Build Pipeline Engine:** [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **User Interface Library:** [React 18](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
*   **Core WYSIWYG Text Editor:** [Tiptap Editor](https://tiptap.dev/)
*   **Database Engine:** [SQLite](https://sqlite.org/) via [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode)
*   **FTS Search Engine:** SQLite FTS5
*   **Build Assembly:** [Electron-builder](https://www.electronjs.org/docs/latest/tutorial/automated-distribution)

---

## Documentation

| Document | Contents |
| :--- | :--- |
| [01_Project_Registry.md](docs/01_Project_Registry.md) | Product intent, v1 scope, RTL rules, data model, backup policy |
| [02_Product_Architecture.md](docs/02_Product_Architecture.md) | Process boundaries, SQLite schema, IPC contracts, build pipeline |
| [03_UI_UX_Spec.md](docs/03_UI_UX_Spec.md) | Layout dimensions, color palette, RTL CSS, component interactions |
| [04_Phase_Implementation_Plan.md](docs/04_Phase_Implementation_Plan.md) | Seven-phase implementation blueprint |
| [Google_Credentials_Setup.md](docs/Google_Credentials_Setup.md) | Google Cloud Console setup, minimal scopes, troubleshooting, and manual QA checklist |

---

## Getting Started (Development Setup)

### Prerequisites
**Node.js (v18+)** and C++ build tools for `better-sqlite3` native bindings. On Windows:
```powershell
npm install --global --production windows-build-tools
```

### Install & Run
```powershell
cd "C:\Projects\NAS Notesbook"
npm install
npm run dev
```

### Build
```powershell
npm run build
```
Output lands in `./dist-build` with icon `assets/icon.ico`.

---

## License & Copyright

All architectural specifications, designs, and software assets are reserved for proprietary use under the NAS Notesbook local deployment agreements.
