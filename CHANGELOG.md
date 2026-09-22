# Changelog

## 8.0.0 - 2026-09-22

### Security and reliability

- Blocked untrusted main-window navigation and embedded webviews.
- Added OAuth state, PKCE, callback timeout, and server error handling.
- Restricted NASBK overwrite operations to user-approved paths.
- Sanitized imported HTML and updated all vulnerable dependencies.
- Enabled automatic Google Drive backup when configured.

### Editor

- Added accessible `+ / −` controls and expanded presets for text size and line spacing.
- Added code-block language, font-size, direction, wrapping, color, and upper copy controls.
- Reduced note-list database and IPC payloads by selecting bounded previews.

## 0.9.0 - 2026-07-25

### Fixed

- Prevented note loss when closing the application before autosave completed.
- Added a Renderer/Main Process close handshake that waits for SQLite persistence.
- Queued a follow-up save when edits occur during an active save.
- Added final dirty-state verification before confirming application close.
- Added SQLite integrity validation at startup.
- Added WAL checkpoint and rotating database snapshots during clean shutdown.

### Build and QA

- Added GitHub Actions validation for lint, typecheck, tests and production build.
- Added a Windows pipeline that builds and verifies the NSIS installer.
- Added regression checks protecting the close-save handshake and recovery safeguards.
