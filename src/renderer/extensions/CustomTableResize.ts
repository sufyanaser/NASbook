import { TableView } from "@tiptap/extension-table";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { TableMap, cellAround, pointsAtCell } from "@tiptap/pm/tables";
import { Decoration, DecorationSet, EditorView, NodeView } from "@tiptap/pm/view";

export const customColumnResizingPluginKey = new PluginKey("tableColumnResizing");

interface DraggingState {
  readonly startX: number;
  readonly startColWidths: readonly number[];
  readonly physicalLeftCol: number;
  readonly physicalRightCol: number;
}

interface ResizeMeta {
  readonly setHandle?: number;
  readonly setDragging?: DraggingState | null;
}

interface ResizeHandleColumns {
  readonly tableDOM: HTMLTableElement;
  readonly columnCount: number;
  readonly physicalLeftCol: number;
  readonly physicalRightCol: number;
}

type TableDirection = "ltr" | "rtl";

export class ResizeState {
  constructor(
    public readonly activeHandle: number,
    public readonly dragging: DraggingState | null,
  ) {}

  apply(tr: Transaction): ResizeState {
    const action = tr.getMeta(customColumnResizingPluginKey) as ResizeMeta | undefined;

    if (action && action.setHandle !== undefined) {
      return new ResizeState(action.setHandle, null);
    }

    if (action && action.setDragging !== undefined) {
      return new ResizeState(this.activeHandle, action.setDragging);
    }

    if (this.activeHandle > -1 && tr.docChanged) {
      let handle = tr.mapping.map(this.activeHandle, -1);

      if (!pointsAtCell(tr.doc.resolve(handle))) {
        handle = -1;
      }

      return new ResizeState(handle, this.dragging);
    }

    return this;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asPositiveWidth(value: number, fallbackWidth: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallbackWidth;
}

export function transferColumnResizeDelta(
  startColWidths: readonly number[],
  physicalLeftCol: number,
  physicalRightCol: number,
  dragDeltaPx: number,
  cellMinWidth: number,
): number[] {
  const fallbackWidth = Math.max(1, cellMinWidth);
  const nextWidths = startColWidths.map((width) => asPositiveWidth(width, fallbackWidth));
  const leftStart = nextWidths[physicalLeftCol];
  const rightStart = nextWidths[physicalRightCol];

  if (leftStart === undefined || rightStart === undefined) {
    return nextWidths;
  }

  const leftMin = Math.min(leftStart, fallbackWidth);
  const rightMin = Math.min(rightStart, fallbackWidth);
  const minDelta = leftMin - leftStart;
  const maxDelta = rightStart - rightMin;
  const clampedDelta = clamp(dragDeltaPx, minDelta, maxDelta);

  nextWidths[physicalLeftCol] = leftStart + clampedDelta;
  nextWidths[physicalRightCol] = rightStart - clampedDelta;

  return nextWidths;
}

function roundColumnWidthsPreservingTotal(widths: readonly number[]): number[] {
  const normalizedWidths = widths.map((width) => Math.max(1, width));
  const targetTotal = Math.max(
    normalizedWidths.length,
    Math.round(normalizedWidths.reduce((total, width) => total + width, 0)),
  );
  const roundedWidths = normalizedWidths.map((width) => Math.floor(width));
  const floorTotal = roundedWidths.reduce((total, width) => total + width, 0);
  let remainingPixels = targetTotal - floorTotal;

  const fractionOrder = normalizedWidths
    .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of fractionOrder) {
    if (remainingPixels <= 0) {
      break;
    }

    roundedWidths[index] += 1;
    remainingPixels -= 1;
  }

  return roundedWidths;
}

function getDOMColWidths(tableDOM: HTMLTableElement, colCount: number): number[] {
  const colWidths: number[] = [];
  const firstRowDOM = tableDOM.querySelector("tr");

  if (firstRowDOM) {
    const cells = firstRowDOM.querySelectorAll("td, th");

    cells.forEach((cell) => {
      const colspan = Math.max(1, Number.parseInt(cell.getAttribute("colspan") || "1", 10));
      const cellWidth = (cell as HTMLElement).getBoundingClientRect().width;
      const widthPerCol = cellWidth / colspan;

      for (let index = 0; index < colspan; index += 1) {
        colWidths.push(widthPerCol);
      }
    });
  }

  const totalMeasured = colWidths.reduce((total, width) => total + width, 0);

  if (colWidths.length !== colCount || totalMeasured <= 0) {
    const defaultWidth = tableDOM.getBoundingClientRect().width / colCount || 100;

    return Array(colCount).fill(defaultWidth);
  }

  return colWidths.slice(0, colCount);
}

function updateTableColumnWidths(view: EditorView, cellPos: number, newWidths: readonly number[]): void {
  const roundedWidths = roundColumnWidthsPreservingTotal(newWidths);
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const tr = view.state.tr;

  for (let row = 0; row < map.height; row += 1) {
    for (let col = 0; col < map.width; col += 1) {
      const mapIndex = row * map.width + col;

      if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) {
        continue;
      }

      const pos = map.map[mapIndex];

      if (col > 0 && map.map[mapIndex] === map.map[mapIndex - 1]) {
        continue;
      }

      const cellNode = table.nodeAt(pos);

      if (!cellNode) {
        continue;
      }

      const attrs = cellNode.attrs;
      const cellColStart = map.colCount(pos);
      const colspan = Math.max(1, Number(attrs.colspan) || 1);
      const colwidth = Array.isArray(attrs.colwidth)
        ? [...attrs.colwidth]
        : Array(colspan).fill(0);
      let changed = false;

      for (let index = 0; index < colspan; index += 1) {
        const targetWidth = roundedWidths[cellColStart + index];

        if (targetWidth === undefined) {
          continue;
        }

        if (colwidth[index] !== targetWidth) {
          colwidth[index] = targetWidth;
          changed = true;
        }
      }

      if (changed) {
        tr.setNodeMarkup(start + pos, null, {
          ...attrs,
          colwidth,
        });
      }
    }
  }

  if (tr.docChanged) {
    view.dispatch(tr);
  }
}

function getElement(node: Node | null): HTMLElement | null {
  return node instanceof HTMLElement ? node : null;
}

function getTableDOM(view: EditorView, tablePos: number, cellPos: number): HTMLTableElement | null {
  const tableNode = getElement(view.nodeDOM(tablePos));

  if (tableNode?.nodeName === "TABLE") {
    return tableNode as HTMLTableElement;
  }

  const nestedTable = tableNode?.querySelector("table");

  if (nestedTable) {
    return nestedTable;
  }

  const cellNode = getElement(view.nodeDOM(cellPos));

  return cellNode?.closest("table") ?? null;
}

function equalColumnWidths(totalWidth: number, colCount: number): number[] {
  const roundedTotal = Math.max(colCount, Math.round(totalWidth));
  const baseWidth = Math.floor(roundedTotal / colCount);
  const extraPixels = roundedTotal - baseWidth * colCount;

  return Array.from({ length: colCount }, (_, index) => baseWidth + (index < extraPixels ? 1 : 0));
}

export function normalizeSelectedTableColumnWidths(view: EditorView): boolean {
  const $cell = cellAround(view.state.selection.$from);

  if (!$cell) {
    return false;
  }

  const table = $cell.node(-1);
  const map = TableMap.get(table);

  if (map.width <= 0) {
    return false;
  }

  const tableDOM = getTableDOM(view, $cell.before(-1), $cell.pos);

  if (!tableDOM) {
    return false;
  }

  const measuredWidth = tableDOM.getBoundingClientRect().width || 0;
  const fallbackWidth = getDOMColWidths(tableDOM, map.width).reduce((total, width) => total + width, 0);
  const tableWidth = measuredWidth > 0 ? measuredWidth : fallbackWidth;

  if (tableWidth <= 0) {
    return false;
  }

  updateTableColumnWidths(view, $cell.pos, equalColumnWidths(tableWidth, map.width));

  return true;
}

function displayTableColumnWidths(
  view: EditorView,
  cellPos: number,
  newWidths: readonly number[],
  defaultCellMinWidth: number,
): void {
  const $cell = view.state.doc.resolve(cellPos);
  const tableDOM = getTableDOM(view, $cell.before(-1), cellPos);

  if (!tableDOM) {
    return;
  }

  const colgroup = tableDOM.querySelector("colgroup");

  if (!colgroup) {
    return;
  }

  let colDOM = colgroup.firstElementChild as HTMLTableColElement | null;
  let totalWidth = 0;
  let fixedWidth = true;

  for (const width of newWidths) {
    const normalizedWidth = asPositiveWidth(width, defaultCellMinWidth);
    const cssWidth = `${normalizedWidth}px`;

    totalWidth += normalizedWidth;

    if (!width) {
      fixedWidth = false;
    }

    if (!colDOM) {
      colDOM = document.createElement("col");
      colgroup.appendChild(colDOM);
    }

    if (colDOM.style.width !== cssWidth) {
      colDOM.style.width = cssWidth;
    }

    colDOM = colDOM.nextElementSibling as HTMLTableColElement | null;
  }

  while (colDOM) {
    const next = colDOM.nextElementSibling as HTMLTableColElement | null;

    colDOM.remove();
    colDOM = next;
  }

  if (fixedWidth) {
    tableDOM.style.width = `${totalWidth}px`;
    tableDOM.style.minWidth = "";
  } else {
    tableDOM.style.width = "";
    tableDOM.style.minWidth = `${totalWidth}px`;
  }
}

function domCellAround(target: EventTarget | null): HTMLElement | null {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element.nodeName !== "TD" && element.nodeName !== "TH") {
    element = element.classList.contains("ProseMirror") ? null : element.parentElement;
  }

  return element;
}

function getTableDirection(tableDOM: HTMLTableElement): TableDirection {
  const view = tableDOM.ownerDocument.defaultView;

  return view?.getComputedStyle(tableDOM).direction === "rtl" ? "rtl" : "ltr";
}

function getCellColumn($cell: ReturnType<typeof cellAround>): number {
  if (!$cell) {
    return -1;
  }

  const table = $cell.node(-1);
  const map = TableMap.get(table);

  return map.colCount($cell.pos - $cell.start(-1));
}

function getHandleColumn($cell: ReturnType<typeof cellAround>): number {
  if (!$cell) {
    return -1;
  }

  const colspan = Math.max(1, Number($cell.nodeAfter?.attrs.colspan) || 1);

  return getCellColumn($cell) + colspan - 1;
}

function getResizeHandleColumns(view: EditorView, cellPos: number): ResizeHandleColumns | null {
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const tableDOM = getTableDOM(view, $cell.before(-1), cellPos);

  if (!tableDOM) {
    return null;
  }

  const handleCol = getHandleColumn($cell);
  const direction = getTableDirection(tableDOM);
  const physicalLeftCol = handleCol;
  const physicalRightCol = direction === "rtl" ? handleCol - 1 : handleCol + 1;

  if (
    physicalLeftCol < 0 ||
    physicalLeftCol >= map.width ||
    physicalRightCol < 0 ||
    physicalRightCol >= map.width
  ) {
    return null;
  }

  return {
    tableDOM,
    columnCount: map.width,
    physicalLeftCol,
    physicalRightCol,
  };
}

function edgeCell(view: EditorView, event: MouseEvent, side: "left" | "right", handleWidth: number): number {
  const offset = side === "right" ? -handleWidth : handleWidth;
  const found = view.posAtCoords({
    left: event.clientX + offset,
    top: event.clientY,
  });

  if (!found) {
    return -1;
  }

  const $cell = cellAround(view.state.doc.resolve(found.pos));

  if (!$cell) {
    return -1;
  }

  if (side === "right") {
    return $cell.pos;
  }

  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const tableDOM = getTableDOM(view, $cell.before(-1), $cell.pos);

  if (!tableDOM) {
    return -1;
  }

  const direction = getTableDirection(tableDOM);
  const cellOffset = $cell.pos - start;
  const cellMapIndex = map.map.indexOf(cellOffset);

  if (cellMapIndex < 0) {
    return -1;
  }

  const row = Math.floor(cellMapIndex / map.width);
  const cellStartCol = map.colCount(cellOffset);
  const cellEndCol = getHandleColumn($cell);
  const adjacentCol = direction === "rtl" ? cellEndCol + 1 : cellStartCol - 1;

  if (adjacentCol < 0 || adjacentCol >= map.width) {
    return -1;
  }

  return start + map.map[row * map.width + adjacentCol];
}

function handleMouseMove(view: EditorView, event: MouseEvent, handleWidth: number): void {
  if (!view.editable) {
    return;
  }

  const pluginState = customColumnResizingPluginKey.getState(view.state) as ResizeState | undefined;

  if (!pluginState || pluginState.dragging) {
    return;
  }

  const target = domCellAround(event.target);
  let cell = -1;

  if (target) {
    const { left, right } = target.getBoundingClientRect();

    if (event.clientX - left <= handleWidth) {
      cell = edgeCell(view, event, "left", handleWidth);
    } else if (right - event.clientX <= handleWidth) {
      cell = edgeCell(view, event, "right", handleWidth);
    }
  }

  if (cell !== -1 && !getResizeHandleColumns(view, cell)) {
    cell = -1;
  }

  if (cell !== pluginState.activeHandle) {
    updateHandle(view, cell);
  }
}

function handleMouseLeave(view: EditorView): void {
  if (!view.editable) {
    return;
  }

  const pluginState = customColumnResizingPluginKey.getState(view.state) as ResizeState | undefined;

  if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) {
    updateHandle(view, -1);
  }
}

function updateHandle(view: EditorView, value: number): void {
  view.dispatch(view.state.tr.setMeta(customColumnResizingPluginKey, { setHandle: value }));
}

function handleMouseDown(
  view: EditorView,
  event: MouseEvent,
  cellMinWidth: number,
  defaultCellMinWidth: number,
): boolean {
  if (!view.editable) {
    return false;
  }

  const win = view.dom.ownerDocument.defaultView || window;
  const pluginState = customColumnResizingPluginKey.getState(view.state) as ResizeState | undefined;

  if (!pluginState || pluginState.activeHandle === -1 || pluginState.dragging) {
    return false;
  }

  const activeHandle = pluginState.activeHandle;
  const resizeColumns = getResizeHandleColumns(view, activeHandle);

  if (!resizeColumns) {
    return false;
  }

  const startColWidths = getDOMColWidths(resizeColumns.tableDOM, resizeColumns.columnCount);

  displayTableColumnWidths(view, activeHandle, startColWidths, defaultCellMinWidth);

  view.dispatch(
    view.state.tr.setMeta(customColumnResizingPluginKey, {
      setDragging: {
        startX: event.clientX,
        startColWidths,
        physicalLeftCol: resizeColumns.physicalLeftCol,
        physicalRightCol: resizeColumns.physicalRightCol,
      },
    }),
  );

  function finish(finishEvent: MouseEvent): void {
    win.removeEventListener("mouseup", finish);
    win.removeEventListener("mousemove", move);

    const currentPluginState = customColumnResizingPluginKey.getState(view.state) as ResizeState | undefined;

    if (currentPluginState?.dragging) {
      const { startX, startColWidths: widths, physicalLeftCol, physicalRightCol } = currentPluginState.dragging;
      const nextColWidths = transferColumnResizeDelta(
        widths,
        physicalLeftCol,
        physicalRightCol,
        finishEvent.clientX - startX,
        cellMinWidth,
      );

      updateTableColumnWidths(view, currentPluginState.activeHandle, nextColWidths);
      view.dispatch(view.state.tr.setMeta(customColumnResizingPluginKey, { setDragging: null }));
    }
  }

  function move(moveEvent: MouseEvent): void {
    if (moveEvent.buttons === 0) {
      finish(moveEvent);
      return;
    }

    const currentPluginState = customColumnResizingPluginKey.getState(view.state) as ResizeState | undefined;

    if (!currentPluginState?.dragging) {
      return;
    }

    const { startX, startColWidths: widths, physicalLeftCol, physicalRightCol } = currentPluginState.dragging;
    const nextColWidths = transferColumnResizeDelta(
      widths,
      physicalLeftCol,
      physicalRightCol,
      moveEvent.clientX - startX,
      cellMinWidth,
    );

    displayTableColumnWidths(view, currentPluginState.activeHandle, nextColWidths, defaultCellMinWidth);
  }

  win.addEventListener("mouseup", finish);
  win.addEventListener("mousemove", move);
  event.preventDefault();

  return true;
}

function handleDecorations(state: EditorState, cell: number): DecorationSet {
  const decorations = [];
  const $cell = state.doc.resolve(cell);
  const table = $cell.node(-1);

  if (!table) {
    return DecorationSet.empty;
  }

  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const col = getHandleColumn($cell);

  for (let row = 0; row < map.height; row += 1) {
    const index = col + row * map.width;

    if (
      (col === map.width - 1 || map.map[index] !== map.map[index + 1]) &&
      (row === 0 || map.map[index] !== map.map[index - map.width])
    ) {
      const cellPos = map.map[index];
      const cellNode = table.nodeAt(cellPos);

      if (cellNode) {
        const pos = start + cellPos + cellNode.nodeSize - 1;
        const dom = document.createElement("div");
        const pluginState = customColumnResizingPluginKey.getState(state) as ResizeState | undefined;

        dom.className = "column-resize-handle";

        if (pluginState?.dragging) {
          decorations.push(
            Decoration.node(start + cellPos, start + cellPos + cellNode.nodeSize, {
              class: "column-resize-dragging",
            }),
          );
        }

        decorations.push(Decoration.widget(pos, dom));
      }
    }
  }

  return DecorationSet.create(state.doc, decorations);
}

export interface CustomColumnResizingOptions {
  readonly handleWidth?: number;
  readonly cellMinWidth?: number;
  readonly defaultCellMinWidth?: number;
  readonly View?: (new (node: ProseMirrorNode, cellMinWidth: number, view: EditorView) => NodeView) | null;
}

export function customColumnResizing({
  handleWidth = 5,
  cellMinWidth = 25,
  defaultCellMinWidth = cellMinWidth,
  View = TableView,
}: CustomColumnResizingOptions = {}): Plugin {
  const plugin = new Plugin({
    key: customColumnResizingPluginKey,
    state: {
      init(_, state) {
        const nodeViews = plugin.spec.props?.nodeViews;
        const tableName = state.schema.nodes.table.name;

        if (View && nodeViews) {
          nodeViews[tableName] = (node: ProseMirrorNode, view: EditorView) => {
            return new View(node, defaultCellMinWidth, view);
          };
        }

        return new ResizeState(-1, null);
      },
      apply(tr, prev) {
        return prev.apply(tr);
      },
    },
    props: {
      attributes: (state) => {
        const pluginState = customColumnResizingPluginKey.getState(state) as ResizeState | undefined;

        return (pluginState && pluginState.activeHandle > -1 ? { class: "resize-cursor" } : {}) as Record<string, string>;
      },
      handleDOMEvents: {
        mousemove: (view, event) => {
          handleMouseMove(view, event, handleWidth);
        },
        mouseleave: (view) => {
          handleMouseLeave(view);
        },
        mousedown: (view, event) => {
          handleMouseDown(view, event, cellMinWidth, defaultCellMinWidth);
        },
      },
      decorations: (state) => {
        const pluginState = customColumnResizingPluginKey.getState(state) as ResizeState | undefined;

        if (pluginState && pluginState.activeHandle > -1) {
          return handleDecorations(state, pluginState.activeHandle);
        }

        return undefined;
      },
      nodeViews: {},
    },
  });

  return plugin;
}
