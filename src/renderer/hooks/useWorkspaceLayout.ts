import { useCallback, useState, type KeyboardEvent, type PointerEvent } from "react";

const MIN_NOTES_WIDTH = 240;
const MAX_NOTES_WIDTH = 480;
const DEFAULT_NOTES_WIDTH = 320;
const WIDTH_STORAGE_KEY = "nas-notesbook.layout.notesListWidth";
const RAIL_STORAGE_KEY = "nas-notesbook.layout.navRailExpanded";
const COLLAPSE_STORAGE_KEY = "nas-notesbook.layout.notesListCollapsed";

function clampNotesWidth(width: number): number {
  return Math.min(MAX_NOTES_WIDTH, Math.max(MIN_NOTES_WIDTH, width));
}

function getInitialNotesWidth(): number {
  const parsed = Number.parseInt(localStorage.getItem(WIDTH_STORAGE_KEY) ?? "", 10);
  return Number.isFinite(parsed) ? clampNotesWidth(parsed) : DEFAULT_NOTES_WIDTH;
}

export interface WorkspaceLayoutController {
  readonly notesListWidth: number;
  readonly navRailExpanded: boolean;
  readonly notesListCollapsed: boolean;
  readonly toggleNavRail: () => void;
  readonly toggleNotesList: () => void;
  readonly handleDividerPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly handleDividerKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function useWorkspaceLayout(): WorkspaceLayoutController {
  const [notesListWidth, setNotesListWidth] = useState(getInitialNotesWidth);
  const [navRailExpanded, setNavRailExpanded] = useState(
    () => localStorage.getItem(RAIL_STORAGE_KEY) === "true",
  );
  const [notesListCollapsed, setNotesListCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true",
  );

  const toggleNavRail = useCallback(() => {
    setNavRailExpanded((current) => {
      const next = !current;
      localStorage.setItem(RAIL_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const toggleNotesList = useCallback(() => {
    setNotesListCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const persistWidth = useCallback((width: number) => {
    const next = clampNotesWidth(width);
    setNotesListWidth(next);
    localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
  }, []);

  const handleDividerPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = notesListWidth;
      document.body.classList.add("is-resizing-notes-pane");

      const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
        persistWidth(startWidth + moveEvent.clientX - startX);
      };
      const handlePointerUp = (): void => {
        document.body.classList.remove("is-resizing-notes-pane");
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [notesListWidth, persistWidth],
  );

  const handleDividerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      persistWidth(notesListWidth + (event.key === "ArrowLeft" ? -16 : 16));
    },
    [notesListWidth, persistWidth],
  );

  return {
    notesListWidth,
    navRailExpanded,
    notesListCollapsed,
    toggleNavRail,
    toggleNotesList,
    handleDividerPointerDown,
    handleDividerKeyDown,
  };
}
