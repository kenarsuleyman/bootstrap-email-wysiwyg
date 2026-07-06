import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode, $getNodeByKey } from "lexical";

import { $isColumnNode, type ColumnNode } from "../nodes/ColumnNode";
import { $isRowNode } from "../nodes/RowNode";
import { $addColumn, $removeColumn, $setColumnSpan } from "../nodes/insertGrid";
import { GRID_UNITS, MAX_COLUMNS } from "../nodes/gridLayout";
import { useGridSelection } from "./GridSelectionContext";

/** Box of a column, relative to the overlay origin (the editor body). */
interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayState {
  colKey: string | null;
  rowKey: string;
  col: Box | null;
  /** Right-edge midpoint of the row, where the add-column button sits. */
  rowEdge: { x: number; y: number };
  span: number;
  columnCount: number;
  /** True when driven by an explicit column selection (pinned + highlighted). */
  pinned: boolean;
}

/** Delay before hiding the (hover) controls, so the pointer can reach them. */
const HIDE_DELAY = 240;

/** Distance from a column's top/bottom edge that counts as an edge-click. */
const EDGE = 9;

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 2.6h4M2.8 4.6h10.4M5 4.6l.5 8.1a1 1 0 0 0 1 .95h3a1 1 0 0 0 1-.95l.5-8.1M6.7 6.9v4.3M9.3 6.9v4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Overlay controls for grid rows/columns, rendered absolutely inside the editor
 * body (its positioning context). Two ways in:
 *
 * - **Hover** a column → a pill on its top-left edge with width steppers
 *   (`−  6  +`) and a delete; a round `+` on the row's right edge adds a column.
 * - **Click a column's top/bottom edge** → selects it: the column is
 *   highlighted, the pill is pinned (always visible), and the toolbar's color
 *   pickers retarget to the column itself (see {@link useGridSelection}).
 *
 * All edits run by node key, independent of the text caret; every change
 * re-balances the row so widths total 12.
 */
export function GridControls(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { selectedColumnKey, selectColumn } = useGridSelection();

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<{
    colKey: string | null;
    rowKey: string;
    pinned: boolean;
  } | null>(null);
  const overControlsRef = useRef(false);
  const selectedRef = useRef<string | null>(selectedColumnKey);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  useEffect(() => {
    selectedRef.current = selectedColumnKey;
  }, [selectedColumnKey]);

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    // A pinned (selected) overlay or the pointer resting on the controls keeps
    // it visible regardless of stray hide requests.
    if (overControlsRef.current || selectedRef.current) return;
    activeRef.current = null;
    setOverlay(null);
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(hide, HIDE_DELAY);
  }, [clearHide, hide]);

  const enterControls = useCallback(() => {
    overControlsRef.current = true;
    clearHide();
  }, [clearHide]);

  const leaveControls = useCallback(() => {
    overControlsRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  // Measure a column/row and read its live span/column-count.
  const measure = useCallback(
    (colKey: string | null, rowKey: string, pinned: boolean) => {
      const container = containerRef.current;
      const rowEl = editor.getElementByKey(rowKey);
      if (!container || !rowEl) {
        if (pinned) selectColumn(null);
        hide();
        return;
      }
      const origin = container.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();

      let col: Box | null = null;
      if (colKey) {
        const colEl = editor.getElementByKey(colKey);
        if (colEl) {
          const r = colEl.getBoundingClientRect();
          col = {
            top: r.top - origin.top,
            left: r.left - origin.left,
            width: r.width,
            height: r.height,
          };
        } else if (pinned) {
          selectColumn(null);
          hide();
          return;
        }
      }

      let span = 0;
      let columnCount = 0;
      editor.read(() => {
        const rowNode = $getNodeByKey(rowKey);
        if ($isRowNode(rowNode)) columnCount = rowNode.getColumns().length;
        if (colKey) {
          const colNode = $getNodeByKey(colKey);
          if ($isColumnNode(colNode)) span = colNode.getSpan();
        }
      });

      activeRef.current = { colKey, rowKey, pinned };
      setOverlay({
        colKey,
        rowKey,
        col,
        rowEdge: {
          x: rowRect.right - origin.left,
          y: rowRect.top - origin.top + rowRect.height / 2,
        },
        span,
        columnCount,
        pinned,
      });
    },
    [editor, hide, selectColumn],
  );

  // --- Hover ---------------------------------------------------------------

  const onPointerOver = useCallback(
    (event: MouseEvent) => {
      if (selectedRef.current) return; // a pinned selection owns the overlay
      const target = event.target as HTMLElement | null;
      const colEl = target?.closest?.(".bew-col") as HTMLElement | null;
      const rowEl = (colEl?.closest(".bew-row") ??
        target?.closest?.(".bew-row")) as HTMLElement | null;

      if (!rowEl) {
        scheduleHide();
        return;
      }

      clearHide();
      let colKey: string | null = null;
      let rowKey: string | null = null;
      editor.read(() => {
        const rowNode = $getNearestNodeFromDOMNode(rowEl);
        if ($isRowNode(rowNode)) rowKey = rowNode.getKey();
        if (colEl) {
          const colNode = $getNearestNodeFromDOMNode(colEl);
          if ($isColumnNode(colNode)) colKey = colNode.getKey();
        }
      });
      if (!rowKey) return;

      const active = activeRef.current;
      if (
        active &&
        !active.pinned &&
        active.rowKey === rowKey &&
        (colKey === null || active.colKey === colKey)
      ) {
        return;
      }
      measure(colKey, rowKey, false);
    },
    [editor, measure, clearHide, scheduleHide],
  );

  // --- Edge-click selection ------------------------------------------------

  const onPointerDown = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const colEl = target?.closest?.(".bew-col") as HTMLElement | null;
      if (!colEl) {
        selectColumn(null); // clicked outside any column
        return;
      }
      const rect = colEl.getBoundingClientRect();
      const nearEdge =
        event.clientY - rect.top <= EDGE || rect.bottom - event.clientY <= EDGE;
      if (!nearEdge) {
        selectColumn(null); // clicking the body places the caret / deselects
        return;
      }
      // Select the column; keep the caret out of it so this is a block-level
      // selection whose colors target the column div.
      event.preventDefault();
      let colKey: string | null = null;
      editor.read(() => {
        const colNode = $getNearestNodeFromDOMNode(colEl);
        if ($isColumnNode(colNode)) colKey = colNode.getKey();
      });
      selectColumn(colKey);
    },
    [editor, selectColumn],
  );

  useEffect(() => {
    return editor.registerRootListener((root, prevRoot) => {
      if (prevRoot) {
        prevRoot.removeEventListener("mouseover", onPointerOver);
        prevRoot.removeEventListener("mouseleave", scheduleHide);
        prevRoot.removeEventListener("mousedown", onPointerDown);
      }
      if (root) {
        root.addEventListener("mouseover", onPointerOver);
        root.addEventListener("mouseleave", scheduleHide);
        root.addEventListener("mousedown", onPointerDown);
      }
    });
  }, [editor, onPointerOver, onPointerDown, scheduleHide]);

  // Drive the overlay from the current selection (pin) when there is one.
  useEffect(() => {
    if (!selectedColumnKey) {
      if (activeRef.current?.pinned) hide();
      return;
    }
    let rowKey: string | null = null;
    editor.read(() => {
      const col = $getNodeByKey(selectedColumnKey);
      if ($isColumnNode(col)) {
        const row = col.getParent();
        if ($isRowNode(row)) rowKey = row.getKey();
      }
    });
    if (rowKey) {
      clearHide();
      measure(selectedColumnKey, rowKey, true);
    } else {
      selectColumn(null);
    }
  }, [editor, selectedColumnKey, measure, clearHide, hide, selectColumn]);

  // Keep the overlay glued to its row/column as the document, scroll, or
  // viewport changes while it's visible.
  useEffect(() => {
    const reflow = () => {
      const active = activeRef.current;
      if (active) measure(active.colKey, active.rowKey, active.pinned);
    };
    const unregister = editor.registerUpdateListener(reflow);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      unregister();
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [editor, measure]);

  useEffect(() => clearHide, [clearHide]);

  // --- Edits (by key, independent of the text selection) -------------------

  const withColumn = (mutate: (column: ColumnNode) => void) => {
    const key = activeRef.current?.colKey;
    if (!key) return;
    editor.update(() => {
      const node = $getNodeByKey(key);
      if ($isColumnNode(node)) mutate(node);
    });
  };

  const addColumn = () => {
    const key = activeRef.current?.rowKey;
    if (!key) return;
    editor.update(() => {
      const row = $getNodeByKey(key);
      if ($isRowNode(row)) $addColumn(row);
    });
  };

  const deleteColumn = () => {
    const wasPinned = activeRef.current?.pinned;
    withColumn((c) => $removeColumn(c));
    if (wasPinned) selectColumn(null);
  };

  const maxSpan = overlay
    ? GRID_UNITS - Math.max(0, overlay.columnCount - 1)
    : GRID_UNITS;
  const canResize = (overlay?.columnCount ?? 0) > 1;

  // Don't steal focus / caret from the editor when clicking a control.
  const keepFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div className="bew-grid-overlay" ref={containerRef} aria-hidden={!overlay}>
      {overlay?.pinned && overlay.col && (
        <div
          className="bew-grid-colsel"
          style={{
            top: overlay.col.top,
            left: overlay.col.left,
            width: overlay.col.width,
            height: overlay.col.height,
          }}
        />
      )}

      {overlay?.col && overlay.colKey && (
        <div
          className="bew-grid-colctrl"
          style={{
            // Left-aligned to the column's top edge, sitting just above the
            // content (flips just below when the row is at the top of the
            // editor). Left-aligned rather than centered so the buttons don't
            // slide under the cursor as the column widens/narrows. A CSS bridge
            // (::after) fills the gap down to the column so the pointer can
            // travel onto the pill without it hiding.
            left: overlay.col.left + 6,
            top: overlay.col.top >= 34 ? overlay.col.top - 4 : overlay.col.top + 4,
            transform:
              overlay.col.top >= 34 ? "translateY(-100%)" : "none",
          }}
          onMouseEnter={enterControls}
          onMouseLeave={leaveControls}
        >
          <button
            type="button"
            className="bew-grid-btn"
            aria-label="Narrow column"
            title="Narrow column"
            disabled={!canResize || overlay.span <= 1}
            onMouseDown={keepFocus}
            onClick={() => withColumn((c) => $setColumnSpan(c, c.getSpan() - 1))}
          >
            −
          </button>
          <span className="bew-grid-span" title="Column width (of 12)">
            {overlay.span}
          </span>
          <button
            type="button"
            className="bew-grid-btn"
            aria-label="Widen column"
            title="Widen column"
            disabled={!canResize || overlay.span >= maxSpan}
            onMouseDown={keepFocus}
            onClick={() => withColumn((c) => $setColumnSpan(c, c.getSpan() + 1))}
          >
            +
          </button>
          <span className="bew-grid-sep" aria-hidden="true" />
          <button
            type="button"
            className="bew-grid-btn bew-grid-btn--danger"
            aria-label="Delete column"
            title="Delete column"
            onMouseDown={keepFocus}
            onClick={deleteColumn}
          >
            <TrashIcon />
          </button>
        </div>
      )}

      {overlay && (
        <button
          type="button"
          className="bew-grid-addcol"
          style={{ top: overlay.rowEdge.y, left: overlay.rowEdge.x }}
          aria-label="Add column"
          title="Add column"
          disabled={overlay.columnCount >= MAX_COLUMNS}
          onMouseEnter={enterControls}
          onMouseLeave={leaveControls}
          onMouseDown={keepFocus}
          onClick={addColumn}
        >
          +
        </button>
      )}
    </div>
  );
}
