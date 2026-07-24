# Changelog

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
