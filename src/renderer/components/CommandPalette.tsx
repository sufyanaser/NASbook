import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguage } from "../../shared/settings";
import type { CategoryRecord, CategorySlug } from "../../shared/categories";
import type { NoteListItem } from "../../shared/ipc";

interface CommandAction {
  readonly id: string;
  readonly type: "action";
  readonly title: string;
  readonly subtitle?: string;
  readonly shortcut?: string;
  readonly icon?: string;
  readonly onExecute: () => void;
}

interface CommandNote {
  readonly id: string;
  readonly type: "note";
  readonly title: string;
  readonly subtitle: string;
  readonly noteId: number;
  readonly onExecute: () => void;
}

type CommandItem = CommandAction | CommandNote;

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly notes: readonly NoteListItem[];
  readonly categories: readonly CategoryRecord[];
  readonly language: AppLanguage;
  readonly hasSelectedNote: boolean;
  readonly onSelectNote: (noteId: number) => void;
  readonly onCreateNote: () => void;
  readonly onOpenSettings: () => void;
  readonly onToggleTheme: () => void;
  readonly onSelectCategory: (slug: CategorySlug) => void;
  readonly onSaveNote?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  notes,
  categories,
  language,
  hasSelectedNote,
  onSelectNote,
  onCreateNote,
  onOpenSettings,
  onToggleTheme,
  onSelectCategory,
  onSaveNote,
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isArabic = language === "ar";

  // Category name lookup map
  const categoryNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Base actions list
  const actions = useMemo<readonly CommandAction[]>(() => {
    const list: CommandAction[] = [
      {
        id: "action-new-note",
        type: "action",
        title: isArabic ? "إنشاء ملاحظة جديدة" : "Create New Note",
        shortcut: "Ctrl+Alt+N",
        onExecute: () => {
          onCreateNote();
          onClose();
        },
      },
    ];

    if (hasSelectedNote && onSaveNote) {
      list.push({
        id: "action-save-note",
        type: "action",
        title: isArabic ? "حفظ الملاحظة الحالية" : "Save Current Note",
        shortcut: "Ctrl+S",
        onExecute: () => {
          onSaveNote();
          onClose();
        },
      });
    }

    list.push(
      {
        id: "action-toggle-theme",
        type: "action",
        title: isArabic ? "تبديل المظهر (فاتح / داكن)" : "Toggle Theme (Light / Dark)",
        onExecute: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: "action-open-settings",
        type: "action",
        title: isArabic ? "فتح الإعدادات" : "Open Settings",
        shortcut: "Ctrl+,",
        onExecute: () => {
          onOpenSettings();
          onClose();
        },
      },
    );

    // Add navigation to categories
    for (const cat of categories) {
      list.push({
        id: `nav-category-${cat.slug}`,
        type: "action",
        title: isArabic ? `الانتقال إلى: ${cat.name}` : `Go to: ${cat.name}`,
        subtitle: isArabic ? "قسم" : "Category",
        onExecute: () => {
          onSelectCategory(cat.slug);
          onClose();
        },
      });
    }

    return list;
  }, [
    isArabic,
    hasSelectedNote,
    onSaveNote,
    onCreateNote,
    onClose,
    onToggleTheme,
    onOpenSettings,
    categories,
    onSelectCategory,
  ]);

  // Filter items based on user query
  const filteredItems = useMemo<readonly CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    // 1. Filter actions
    const matchedActions = actions.filter((act) => {
      if (!q) return true;
      return (
        act.title.toLowerCase().includes(q) ||
        (act.subtitle && act.subtitle.toLowerCase().includes(q))
      );
    });

    // 2. Filter notes
    const matchedNotes: CommandNote[] = [];
    if (q) {
      for (const note of notes) {
        const titleMatch = note.title.toLowerCase().includes(q);
        const previewMatch = note.preview?.toLowerCase().includes(q);
        if (titleMatch || previewMatch) {
          const categoryName = note.categoryId
            ? categoryNames.get(note.categoryId)
            : undefined;
          matchedNotes.push({
            id: `note-${note.id}`,
            type: "note",
            title: note.title.trim()
              ? note.title
              : (isArabic ? "ملاحظة بدون عنوان" : "Untitled note"),
            subtitle: categoryName
              ? `${categoryName} • ${note.preview?.slice(0, 75) || ""}`
              : note.preview?.slice(0, 75) || "",
            noteId: note.id,
            onExecute: () => {
              onSelectNote(note.id);
              onClose();
            },
          });
          if (matchedNotes.length >= 25) break;
        }
      }
    } else {
      // If query is empty, show top 5 recent notes
      for (const note of notes.slice(0, 5)) {
        const categoryName = note.categoryId
          ? categoryNames.get(note.categoryId)
          : undefined;
        matchedNotes.push({
          id: `note-${note.id}`,
          type: "note",
          title: note.title.trim()
            ? note.title
            : (isArabic ? "ملاحظة بدون عنوان" : "Untitled note"),
          subtitle: categoryName ? `${categoryName} • ${isArabic ? "ملاحظة حديثة" : "Recent"}` : (isArabic ? "ملاحظة حديثة" : "Recent"),
          noteId: note.id,
          onExecute: () => {
            onSelectNote(note.id);
            onClose();
          },
        });
      }
    }

    return [...matchedActions, ...matchedNotes];
  }, [query, actions, notes, isArabic, categoryNames, onSelectNote, onClose]);

  // Keep active index within bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filteredItems.length > 0
            ? (prev - 1 + filteredItems.length) % filteredItems.length
            : 0,
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = filteredItems[activeIndex];
        if (selected) {
          selected.onExecute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, filteredItems, activeIndex, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop command-palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={isArabic ? "لوحة الأوامر والبحث" : "Command Palette"}
        aria-modal="true"
        className="command-palette-modal"
        role="dialog"
      >
        <div className="command-palette-search-wrapper">
          <svg
            className="command-palette-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            aria-label={isArabic ? "البحث في الأوامر والملاحظات" : "Search commands and notes"}
            className="command-palette-input"
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isArabic
                ? "ابحث في الملاحظات أو اكتب أمراً..."
                : "Search notes or run commands..."
            }
            type="text"
            value={query}
          />
          <kbd className="command-palette-esc-badge" onClick={onClose} role="button">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="command-palette-list" role="listbox">
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty">
              {isArabic ? "لا توجد نتائج مطابقة" : "No matching results"}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={item.id}
                  aria-selected={isActive}
                  className={`command-palette-item ${isActive ? "command-palette-item-active" : ""}`}
                  onClick={() => item.onExecute()}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                >
                  <div className="command-palette-item-content">
                    <span className="command-palette-item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="command-palette-item-subtitle">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.type === "action" && item.shortcut && (
                    <kbd className="command-palette-shortcut">{item.shortcut}</kbd>
                  )}
                  {item.type === "note" && (
                    <span className="command-palette-note-badge">
                      {isArabic ? "ملاحظة" : "Note"}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span className="command-palette-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> {isArabic ? "للتنقل" : "to navigate"}
          </span>
          <span className="command-palette-hint">
            <kbd>↵</kbd> {isArabic ? "للاختيار" : "to select"}
          </span>
          <span className="command-palette-hint">
            <kbd>Esc</kbd> {isArabic ? "للإغلاق" : "to dismiss"}
          </span>
        </div>
      </section>
    </div>
  );
}
