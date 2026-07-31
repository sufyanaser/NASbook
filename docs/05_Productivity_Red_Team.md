# Productivity Features — Red Team Review

## Implemented

- Heading collapse/expand is view-only and scoped to the active Tiptap editor.
- A horizontal rule ends the collapsible section immediately.
- A heading at the same or a higher level also ends the section.
- Edit lock is stored with the note in SQLite, included in database backups, and enforced in the data layer.
- Locked notes remain selectable so text can be copied, while title/content changes and destructive actions are rejected.
- The text/fill palette contains 16 colors. Applying a fill also chooses black or white text using WCAG relative luminance.

## Red Team decisions

- Removed the page-wide `MutationObserver`; it caused repeated DOM scans and IPC reads while typing.
- Removed `document.execCommand` color handling; all colors now use Tiptap transactions and undo history.
- Removed the separate `editor-productivity.json`; note IDs can change after restore, so lock state belongs in SQLite.
- Collapse state is intentionally session-only. Persisting it inside note content would add hidden metadata to exported notes.

## Small follow-up candidates

Only consider these after measuring real usage:

1. Add one configurable shortcut for lock/unlock if toolbar usage proves slow.
2. Add “expand all” only if notes commonly contain many collapsed headings.
3. Lazy-load infrequently used settings/integration screens to reduce the current renderer bundle.

Avoid global collapse state, nested side panels, collaboration, or extra note metadata until a real workflow requires them.
