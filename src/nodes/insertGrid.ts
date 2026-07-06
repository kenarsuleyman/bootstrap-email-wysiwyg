import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
} from "lexical";
import type { LexicalEditor } from "lexical";
import { $findMatchingParent, $insertNodeToNearestRoot } from "@lexical/utils";

import { BootstrapParagraphNode } from "./BootstrapParagraphNode";
import { $createColumnNode, $isColumnNode, type ColumnNode } from "./ColumnNode";
import { $createRowNode, $isRowNode, type RowNode } from "./RowNode";
import type { ColorKind } from "./applyColor";
import {
  MAX_COLUMNS,
  clampColumnCount,
  distributeSpans,
  resizeSpans,
} from "./gridLayout";

/** Default number of columns a freshly inserted grid starts with. */
export const DEFAULT_GRID_COLUMNS = 2;

/** A column seeded with an empty paragraph so the cursor can enter it. */
function $createFilledColumn(span: number): ColumnNode {
  const column = $createColumnNode(span);
  column.append(new BootstrapParagraphNode());
  return column;
}

/** Push a set of spans onto a row's columns, in order. */
function $applySpans(row: RowNode, spans: number[]): void {
  row.getColumns().forEach((column, i) => {
    column.setSpan(spans[i]);
  });
}

/** Build a grid row with `count` evenly-sized columns. */
export function $createGridRow(count: number): RowNode {
  const spans = distributeSpans(count);
  const row = $createRowNode();
  spans.forEach((span) => row.append($createFilledColumn(span)));
  return row;
}

/** The column enclosing the current selection, or `null`. */
export function $getSelectedColumn(): ColumnNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const node = selection.anchor.getNode();
  if ($isColumnNode(node)) return node;
  const column = $findMatchingParent(node, $isColumnNode);
  return $isColumnNode(column) ? column : null;
}

/**
 * Insert a grid (a row of evenly-sized columns) as a block at the current
 * selection, and place the cursor in the first column. No-op without a range
 * selection (e.g. the editor isn't focused).
 */
export function insertGrid(
  editor: LexicalEditor,
  columns: number = DEFAULT_GRID_COLUMNS,
): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const row = $createGridRow(clampColumnCount(columns));
    $insertNodeToNearestRoot(row);
    const firstChild = row.getColumns()[0]?.getFirstChild();
    if ($isElementNode(firstChild)) firstChild.selectEnd();
  });
}

/**
 * Add a column to `row`, re-balancing all columns to even widths (e.g. two
 * `6·6` columns become `4·4·4`). No-op once the row already holds 12 columns.
 */
export function $addColumn(row: RowNode): void {
  const count = row.getColumns().length;
  if (count >= MAX_COLUMNS) return;
  row.append($createFilledColumn(1));
  $applySpans(row, distributeSpans(count + 1));
}

/**
 * Remove `column` from its row, re-balancing the survivors to even widths.
 * Removing the last remaining column removes the whole row.
 */
export function $removeColumn(column: ColumnNode): void {
  const row = column.getParent();
  if (!$isRowNode(row)) return;
  const count = row.getColumns().length;
  if (count <= 1) {
    row.remove();
    return;
  }
  column.remove();
  $applySpans(row, distributeSpans(count - 1));
}

/**
 * Set `column` to `target` units, absorbing the difference into its siblings so
 * the row still totals 12 (e.g. widening one of `4·4·4` to 6 gives `6·3·3`).
 */
export function $setColumnSpan(column: ColumnNode, target: number): void {
  const row = column.getParent();
  if (!$isRowNode(row)) return;
  const columns = row.getColumns();
  const index = columns.indexOf(column);
  if (index === -1) return;
  const spans = resizeSpans(
    columns.map((c) => c.getSpan()),
    index,
    target,
  );
  $applySpans(row, spans);
}

/**
 * Set a text / background / border color on a specific column (by key), so it
 * lands on the exported `col-N` div itself rather than the content inside.
 * `token` is a palette token, a `#hex`, or `null` to clear.
 */
export function setColumnColor(
  editor: LexicalEditor,
  columnKey: string,
  kind: ColorKind,
  token: string | null,
): void {
  editor.update(() => {
    const node = $getNodeByKey(columnKey);
    if (!$isColumnNode(node)) return;
    if (kind === "text") node.setTextColor(token);
    else if (kind === "bg") node.setBgColor(token);
    else node.setBorderColor(token);
  });
}

/** Add a column to the grid containing the current selection. */
export function addGridColumn(editor: LexicalEditor): void {
  editor.update(() => {
    const column = $getSelectedColumn();
    const row = column?.getParent();
    if ($isRowNode(row)) $addColumn(row);
  });
}

/** Remove the column containing the current selection. */
export function removeGridColumn(editor: LexicalEditor): void {
  editor.update(() => {
    const column = $getSelectedColumn();
    if (column) $removeColumn(column);
  });
}

/**
 * Widen (`delta > 0`) or narrow (`delta < 0`) the column containing the current
 * selection by `delta` units, re-balancing the rest of the row.
 */
export function adjustGridColumn(editor: LexicalEditor, delta: number): void {
  editor.update(() => {
    const column = $getSelectedColumn();
    if (column) $setColumnSpan(column, column.getSpan() + delta);
  });
}
