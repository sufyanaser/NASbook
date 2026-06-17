# NAS Notesbook - UI/UX Specification

This document details the visual design system, layout dimensions, Arabic typography stacks, and component mockups for NAS Notesbook v1.

**Layout reference:** The three-panel structure (navigation rail, notes list, editor) follows the general visual layout pattern seen in Notesnook. Notesnook is a **UX layout reference only**—not a feature target and not a source-code reference.

---

## 1. Visual Design Philosophy & Color Palette

NAS Notesbook employs a professional, light neutral interface designed to maximize reading focus and reduce visual fatigue. It avoids heavy gradients, box shadows, and translucent effects, opting instead for clean border separation and crisp, structured content blocks.

### 1.1 Color Palette (Tailwind reference)
The color scale relies on neutral warm slate and off-white tones:

| Layer | Hex Code | Tailwind class | Usage |
| :--- | :--- | :--- | :--- |
| **Workspace Background** | `#FBFBFA` | `bg-stone-50` | Primary app background (behind editor) |
| **Sidebar & Panels** | `#F5F5F4` | `bg-stone-100` | Navigation rail & list column backgrounds |
| **Borders** | `#E7E5E4` | `border-stone-200` | Pane split lines, inputs, table boundaries |
| **Text Primary** | `#1C1917` | `text-stone-900` | Headings, active editor lines, note titles |
| **Text Secondary** | `#57534E` | `text-stone-600` | Note preview text, tags, dates, details |
| **Active Highlight** | `#E7E5E4` | `bg-stone-200` | Selected list items & toggled states |
| **Danger (Trash)** | `#EF4444` | `text-red-500` | Trash icons, hard deletes, error notices |

---

## 2. Desktop Workspace Layout

The interface is structured horizontally across three distinct vertical panels + a bottom status footer.

```
+========================================================================================+
|  N  |  SEARCH NOTES...   [Q]  |  Untitled Note                                    [x]  |
|  A  |-------------------------|--------------------------------------------------------|
|  S  | Note 1 Title      10:15 |  [ All Notes ]   [ + Tags... ]                         |
|  N  | Note snippet desc...    |--------------------------------------------------------|
|  O  |-------------------------|  [B] [I] [U] [CodeBlock] [A->] [Copy Prompt] [Export]  |
|  T  | Note 2 Title      Yesterday |--------------------------------------------------------|
|  E  | Note snippet desc...    |  # Introduction to NAS Notesbook                       |
|  S  |                         |                                                        |
|  B  |                         |  This is a personal local-first notebook for prompts,  |
|  O  |                         |  NAS APP contexts, and development notes.              |
|  O  |                         |                                                        |
|  K  |                         |  ```powershell                                         |
|  _  |                         |  Get-Service -Name "NAS*" | Start-Service              |
|     |                         |  ```                                                   |
|-----|-------------------------|--------------------------------------------------------|
| [*] | Trash (4)               |  Characters: 1532 | Saved Local | DIR: RTL (Auto)      |
+========================================================================================+
```

### 2.1 Panel Dimensions
*   **Left Navigation Rail:** `64px` wide. Houses core navigation icons (All Notes, Categories folders, Settings gear at bottom).
*   **Middle Notes List Column:** `320px` wide. Contains the search bar and the list of active notes.
*   **Main Editor Area:** Flexible remaining width. The editing surface fills the panel with comfortable horizontal padding (`px-6` to `px-10`) so long prompts and technical notes are easy to read and write. **No narrow hard-cap in v1.** A user-configurable max-width setting may be added later.
*   **Bottom Status Bar:** `28px` high. Grounded at the very bottom of the viewport.

---

## 3. Component Details & Interactions

### 3.1 Left Navigation Rail (`NavigationRail.tsx`)
- Houses high-contrast icons for primary filter states:
  1. **All Notes** (Default)
  2. **Prompts** (Filter by category)
  3. **ChatGPT Instructions** (Filter by category)
  4. **NAS Projects** (Filter by category)
  5. **PowerShell Commands** (Filter by category)
  6. **Development Notes** (Filter by category)
  7. **Errors & Fixes** (Filter by category)
  8. **Templates** (Filter by category)
  9. **Trash** (Bottom of list)
  10. **Settings Gear** (Positioned strictly at the very bottom)
- Click actions immediately dispatch event triggers to filter the notes list.

### 3.2 Middle Notes List Column (`NotesListColumn.tsx`)
- **Header:**
  - Standard input field with inline placeholder "Search notes..."
  - A subtle clear button `(x)` appears when text is active.
  - A small `[+]` button to instantly create a new note in the currently active category.
- **Notes List Cards:**
  - Displays Note Title, short line preview (first 80 characters), and relative update date (e.g., "10:15 AM", "Yesterday", "June 12").
  - Includes a small `RTL` tag if the note has been explicitly forced to Right-to-Left alignment.
  - Selected state uses background `bg-stone-200` to indicate active editing focus.

### 3.3 Main Editor Area (`NoteEditorArea.tsx`)
- **Metadata Header:**
  - Unstyled Title input field (`text-3xl font-bold`) that resizes automatically.
  - Category selector dropdown styled as a pill.
  - Tag creation input. Pressing `Enter` adds a tag to the note.
- **Top Editor Toolbar:**
  - Bold, Italic, Underline, Strikethrough, Bullet List, Ordered List, Code Block.
  - **RTL Direction Toggle (`A->` or `<-A`):** Explicit button to force RTL/LTR text orientation globally for the note.
  - **Copy Options:**
    - `Copy Note Content`
    - `Copy as ChatGPT Context` (wrap with XML blocks)
  - **Export Option:** `Export to MD` (saves current note directly as clean `.md` file via save dialog).
- **Tiptap Editing Surface:**
  - Content uses the full editor panel width with comfortable line-height (`line-height: 1.625`).
  - Optimized for long ChatGPT prompts and technical prose—not a narrow article column.

### 3.4 Bottom Status Bar (`StatusFooter.tsx`)
- Displays:
  - Total note character and word count.
  - Active save status (`Saved Local` or `Saving...`).
  - Active text direction (`LTR` or `RTL`).
  - Active database path for peace of mind.

### 3.5 Settings (Minimal v1)
- **Local Backup Folder:** Pick a folder path and trigger manual backup.
- No cloud sync, account, or theme configuration in v1.

---

## 4. Arabic RTL Engineering Details

The visual framework is structured to be RTL-ready out of the box. RTL-first Arabic support is non-negotiable.

### 4.1 Global and Block CSS Rules
```css
/* Typography stack setup */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", "Tahoma", "Arial", sans-serif;
}

/* Base Tiptap layout support */
.ProseMirror {
  direction: ltr; /* Default LTR orientation */
  text-align: left;
  max-width: none; /* Full panel width in v1 */
}

/* When RTL flag is true on the note */
.ProseMirror.note-direction-rtl {
  direction: rtl;
  text-align: right;
}

/* Mixed direction paragraphs inside Tiptap */
.ProseMirror p[dir="rtl"], 
.ProseMirror h1[dir="rtl"], 
.ProseMirror h2[dir="rtl"], 
.ProseMirror h3[dir="rtl"],
.ProseMirror li[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

/* Always force English / Code structures to LTR alignment */
.ProseMirror pre, 
.ProseMirror code, 
.ProseMirror .code-block {
  direction: ltr !important;
  text-align: left !important;
  font-family: "Consolas", "Courier New", monospace;
}
```

### 4.2 Auto-Direction Logic
When a note's text direction is set to `Auto` (default), the system analyzes the first character typed in a text block:
```typescript
function detectDirection(text: string): 'rtl' | 'ltr' {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'ltr';
  return arabicRegex.test(trimmed[0]) ? 'rtl' : 'ltr';
}
```
If Arabic text is detected at the start of a paragraph, the Tiptap node attribute is updated with `dir="rtl"` automatically.

---

## 5. Visual States

### 5.1 Empty State UI
If no notes exist in a selected category, the Main Editor displays a clean centered SVG placeholder icon alongside quick actions:
- Create New Note
- Import Markdown File (`.md` or `.txt`)

### 5.2 Soft-Delete Trash Panel
When viewing the `Trash` category:
- The Note Editor is replaced with a read-only preview.
- A prominent top warning banner states: *"This note is in the Trash. Restoring it will return it to its original category."*
- Action buttons:
  - **Restore Note:** Moves note back to its parent category.
  - **Delete Forever:** Triggers permanent SQLite data removal.
