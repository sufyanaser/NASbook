import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type MenuNode =
  | { readonly kind: "separator"; readonly id: string }
  | { readonly kind: "header"; readonly id: string; readonly label: string }
  | {
      readonly kind: "item";
      readonly id: string;
      readonly label: string;
      readonly shortcut?: string;
      readonly danger?: boolean;
      readonly disabled?: boolean;
      readonly checked?: boolean;
      readonly onSelect?: () => void;
      readonly submenu?: readonly MenuNode[];
    };

interface EditorContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly nodes: readonly MenuNode[];
  readonly rtl: boolean;
  readonly onClose: () => void;
}

function MenuList({
  nodes,
  onClose,
}: {
  readonly nodes: readonly MenuNode[];
  readonly onClose: () => void;
}): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="ecm-list" role="menu">
      {nodes.map((node) => {
        if (node.kind === "separator") {
          return <li key={node.id} className="ecm-separator" role="separator" />;
        }
        if (node.kind === "header") {
          return (
            <li key={node.id} className="ecm-header" aria-hidden="true">
              {node.label}
            </li>
          );
        }

        const hasSub = Boolean(node.submenu && node.submenu.length > 0);
        const isOpen = openId === node.id;

        return (
          <li
            key={node.id}
            className="ecm-item-wrap"
            onMouseEnter={() => {
              setOpenId(hasSub && !node.disabled ? node.id : null);
            }}
          >
            <button
              type="button"
              role="menuitem"
              className={`ecm-item${node.danger ? " ecm-item--danger" : ""}`}
              disabled={node.disabled}
              aria-haspopup={hasSub ? "menu" : undefined}
              aria-expanded={hasSub ? isOpen : undefined}
              onClick={() => {
                if (node.disabled) {
                  return;
                }
                if (hasSub) {
                  setOpenId((prev) => (prev === node.id ? null : node.id));
                  return;
                }
                node.onSelect?.();
                onClose();
              }}
            >
              <span className="ecm-check" aria-hidden="true">
                {node.checked ? "✓" : ""}
              </span>
              <span className="ecm-label">{node.label}</span>
              {node.shortcut ? (
                <span className="ecm-shortcut">{node.shortcut}</span>
              ) : null}
              {hasSub ? (
                <span className="ecm-arrow" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </button>
            {hasSub && isOpen ? (
              <div className="ecm-submenu">
                <MenuList nodes={node.submenu ?? []} onClose={onClose} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function EditorContextMenu({
  x,
  y,
  nodes,
  rtl,
  onClose,
}: EditorContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x, y });

  // Clamp the panel inside the viewport once it has measurable dimensions.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    let nextX = x;
    let nextY = y;
    if (nextX + rect.width > window.innerWidth - 8) {
      nextX = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (nextY + rect.height > window.innerHeight - 8) {
      nextY = Math.max(8, window.innerHeight - rect.height - 8);
    }
    setPos({ x: nextX, y: nextY });
  }, [x, y, nodes]);

  // Close on outside click, Escape, or any scroll.
  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onScroll = (): void => onClose();

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="editor-context-menu"
      role="menu"
      dir={rtl ? "rtl" : "ltr"}
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <MenuList nodes={nodes} onClose={onClose} />
    </div>
  );
}
