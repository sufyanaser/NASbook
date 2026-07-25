# NASbook 0.10.0

## Settings Center

- Rebuilt Settings as a centered, responsive control center.
- Organized controls into General, Appearance, Editor, Notes, Backup, Integrations, Shortcuts, and About.
- Added settings search and preserved Arabic RTL and English LTR layouts.
- Kept automatic settings persistence and shortcut conflict protection.

## Local backup

- Added a user-selectable backup directory.
- Added reset to the default NASbook backup directory.
- Added daily and every-launch backup frequencies.
- Preserved retention limits, local metadata, WAL checkpointing, and database integrity safeguards.

## Google integrations

- Kept Google Drive backup as a separate cloud-storage action.
- Added Gmail backup using the Gmail send API and the restricted `gmail.send` OAuth scope.
- Added manual Gmail delivery and optional delivery after a successful local backup.
- Gmail messages are sent to the linked account and include the latest database, settings, and metadata files as attachments.
- Backups above the safe email attachment threshold are directed to Google Drive instead.
- Existing linked Google accounts must be disconnected and reconnected once to approve the new Gmail permission.

## Validation

- ESLint passed with zero warnings.
- Renderer, Main Process, and Preload TypeScript checks passed.
- 41 automated tests passed.
- Production Electron/Vite build passed.
- The Windows installer must pass before promotion to `main`.
