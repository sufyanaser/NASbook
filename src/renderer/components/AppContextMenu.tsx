import { useEffect } from "react";

export interface ContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly canCopy: boolean;
  readonly canPaste: boolean;
  readonly canSelectAll: boolean;
}

interface AppContextMenuProps {
  readonly menu: ContextMenuState | null;
  readonly onAction: (action: "copy" | "paste" | "selectAll") => void;
  readonly onClose: () => void;
}

export function AppContextMenu({
  menu,
  onAction,
  onClose,
}: AppContextMenuProps): JSX.Element | null {
  useEffect(() => {
    if (!menu) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", onClose);
    };
  }, [menu, onClose]);

  if (!menu) {
    return null;
  }

  const left = Math.min(menu.x, window.innerWidth - 172);
  const top = Math.min(menu.y, window.innerHeight - 136);

  return (
    <div
      className="context-menu-layer"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="context-menu"
        onMouseDown={(event) => event.stopPropagation()}
        role="menu"
        style={{ left, top }}
      >
        <button
          disabled={!menu.canCopy}
          onClick={() => onAction("copy")}
          role="menuitem"
          type="button"
        >
          <span>Copy</span>
          <kbd>Ctrl+C</kbd>
        </button>
        <button
          disabled={!menu.canPaste}
          onClick={() => onAction("paste")}
          role="menuitem"
          type="button"
        >
          <span>Paste</span>
          <kbd>Ctrl+V</kbd>
        </button>
        <div className="context-menu-separator" />
        <button
          disabled={!menu.canSelectAll}
          onClick={() => onAction("selectAll")}
          role="menuitem"
          type="button"
        >
          <span>Select All</span>
          <kbd>Ctrl+A</kbd>
        </button>
      </div>
    </div>
  );
}
