# NASbook 0.9.0 autosave QA

## Automated regression coverage

- Close requests must call `event.preventDefault()` in Main Process.
- Main Process must send `window:close-requested`.
- IPC must expose `window:confirmClose`.
- Preload must expose `onCloseRequested()` and `confirmClose()` through Context Bridge.
- Renderer must use `flushSaveBeforeClose()`.
- Renderer must not use asynchronous `beforeunload` persistence.
- Database must run `integrity_check`.
- Database close must run `wal_checkpoint(TRUNCATE)`.
- Database close must create rotating snapshots.

## Required manual release check

1. Open an existing note.
2. Add a unique title and unique content marker.
3. Close immediately from the title-bar close button before the debounce delay expires.
4. Reopen NASbook and verify both values.
5. Repeat using `Alt+F4`.
6. Edit while a save is already in progress, close, reopen, and verify the latest edit.
7. Confirm that a failed save does not close the application.
