# Do not regress autosave

Never move persistence back into `beforeunload`. Native close must remain blocked until Renderer finishes the final SQLite write and calls `window:confirmClose`.
