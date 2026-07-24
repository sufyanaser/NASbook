# Autosave and close reliability contract

The following behavior is required and regression-protected:

1. Editor changes update the latest draft refs.
2. Autosave debounces changes and persists through the typed preload IPC bridge.
3. A save already in progress queues one follow-up save instead of running concurrent SQLite writes.
4. Navigation flushes pending saves before changing the selected note.
5. Native close requests are prevented by Main Process until Renderer confirms persistence.
6. Renderer cancels the debounce timer, waits for active saves, rechecks dirty state, and performs a final save when needed.
7. Main Process closes only after `window:confirmClose`.
8. Save failure leaves the application open and surfaces the existing confirmation flow.
9. SQLite integrity is checked on open, WAL is checkpointed on close, and clean shutdown creates a rotating snapshot.

Do not replace this flow with asynchronous work inside `beforeunload`; Electron does not wait for that Promise before destroying the renderer.
