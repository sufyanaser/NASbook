# NASbook 0.9.0

## Reliability fixes

- Window close is gated by a renderer/Main Process save handshake.
- Pending autosave work is flushed before the window is allowed to close.
- The application waits for the SQLite IPC write to complete before shutdown.
- Save failure keeps the window open instead of silently discarding the draft.
- SQLite integrity is checked when the database opens.
- WAL is checkpointed before database shutdown.
- Clean shutdown creates a rotating database snapshot and retains the latest seven snapshots.

## Validation

The release pipeline runs these gates before producing the Windows installer:

- ESLint with zero warnings
- TypeScript checks for Renderer, Main and Preload
- Node regression tests
- Production Vite/Electron build
- NSIS Windows installer build
- Installer existence verification

## Security boundaries retained

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Local Google credentials and database files are excluded from Git
