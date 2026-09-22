# NASbook V08 / 8.0.0

V08 is a security and editor-productivity release. It preserves the existing SQLite database and installs over V07.

## Highlights

- Blocks untrusted navigation from retaining access to NASbook's Electron preload API.
- Uses OAuth state and PKCE with a bounded local callback for Google linking.
- Restricts NASBK overwrites to file paths explicitly approved by the user.
- Sanitizes imported HTML and updates vulnerable Electron and Tiptap dependencies.
- Adds text-size and line-spacing `+ / −` steppers with expanded presets.
- Adds language, font-size, direction, wrapping, palette, and quick-copy controls for code blocks.
- Enables optional automatic Google Drive upload after a successful local backup.
- Reduces note-list IPC payload size by selecting bounded previews.

## Validation

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run pack:win`. The release workflow must also verify `latest.yml` and the NSIS blockmap before publication.
