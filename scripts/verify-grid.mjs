// Headless check of the Bootstrap Email grid: the pure column-width math
// (even distribution, resize re-balancing, clamping), the Row/Column nodes
// exporting as `<div class="row">` / `<div class="col-N">`, and the structural
// operations (add / remove / resize columns keep the row totalling 12). The
// toolbar UI and live editing are exercised in the browser demo.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const { $getRoot, $createTextNode, ParagraphNode } = await import("lexical");
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);
const { RowNode } = await import("../src/nodes/RowNode.ts");
const { ColumnNode } = await import("../src/nodes/ColumnNode.ts");
const {
  distributeSpans,
  resizeSpans,
  clampColumnCount,
  GRID_UNITS,
  MAX_COLUMNS,
} = await import("../src/nodes/gridLayout.ts");
const {
  $createGridRow,
  $addColumn,
  $removeColumn,
  $setColumnSpan,
  setColumnColor,
} = await import("../src/nodes/insertGrid.ts");
const { toBootstrapEmailHtml } = await import("../src/export.ts");

// Force pending (non-discrete) updates to commit for an immediate read.
const flush = (editor) => editor.update(() => {}, { discrete: true });

let count = 0;
const assert = (cond, msg) => {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
};
const sum = (a) => a.reduce((x, y) => x + y, 0);
const eqArr = (a, b, msg) =>
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)})`);

function makeEditor() {
  return createHeadlessEditor({
    namespace: "verify-grid",
    nodes: [
      RowNode,
      ColumnNode,
      BootstrapParagraphNode,
      {
        replace: ParagraphNode,
        with: () => new BootstrapParagraphNode(),
        withKlass: BootstrapParagraphNode,
      },
    ],
    onError: (e) => {
      throw e;
    },
  });
}

const spansOf = (row) => row.getColumns().map((c) => c.getSpan());

// --- distributeSpans: even layouts that always total 12 --------------------
eqArr(distributeSpans(1), [12], "1 column -> [12]");
eqArr(distributeSpans(2), [6, 6], "2 columns -> [6,6]");
eqArr(distributeSpans(3), [4, 4, 4], "3 columns -> [4,4,4] (the 6·6 + 1 case)");
eqArr(distributeSpans(4), [3, 3, 3, 3], "4 columns -> [3,3,3,3]");
eqArr(distributeSpans(5), [2, 2, 2, 3, 3], "5 columns -> [2,2,2,3,3] (trailing bigger)");
eqArr(distributeSpans(6), [2, 2, 2, 2, 2, 2], "6 columns -> all 2");
eqArr(distributeSpans(12), new Array(12).fill(1), "12 columns -> all 1");
for (let n = 1; n <= 20; n++) {
  const spans = distributeSpans(n);
  assert(sum(spans) === GRID_UNITS, `distributeSpans(${n}) totals 12`);
  assert(
    Math.max(...spans) - Math.min(...spans) <= 1,
    `distributeSpans(${n}) widths differ by <= 1`,
  );
}
assert(distributeSpans(13).length === MAX_COLUMNS, "over-max clamps to 12 columns");
assert(clampColumnCount(0) === 1 && clampColumnCount(99) === 12, "column count clamps to 1..12");

// --- resizeSpans: set one column, re-balance the rest ----------------------
eqArr(resizeSpans([4, 4, 4], 0, 6), [6, 3, 3], "widen first of 4·4·4 to 6 -> 6·3·3");
eqArr(resizeSpans([6, 6], 0, 8), [8, 4], "widen 6·6 to 8 -> 8·4");
eqArr(resizeSpans([3, 3, 3, 3], 1, 9), [1, 9, 1, 1], "resize clamps siblings to >= 1");
eqArr(resizeSpans([3, 3, 3, 3], 0, 99), [9, 1, 1, 1], "target over max clamps to 12-(n-1)");
eqArr(resizeSpans([4, 4, 4], 2, 0), [5, 6, 1], "target below 1 clamps to 1, rest re-balanced");
eqArr(resizeSpans([6, 6], 0, 6), [6, 6], "single-row resize keeps total 12");
eqArr(resizeSpans([12], 0, 4), [12], "single column is always [12]");

// --- Export: Row/Column -> <div class="row"> / <div class="col-N"> ---------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(2);
      const cols = row.getColumns();
      cols[0].getFirstChild().append($createTextNode("Left"));
      cols[1].getFirstChild().append($createTextNode("Right"));
      root.append(row);
    },
    { discrete: true },
  );
  const html = toBootstrapEmailHtml(editor);
  console.log("\nGrid export:\n" + html + "\n");
  assert(html.includes('<div class="row">'), "row exports as <div class=\"row\">");
  assert(
    (html.match(/class="col-6"/g) || []).length === 2,
    "two even columns export as col-6",
  );
  assert(html.includes("Left") && html.includes("Right"), "column text is preserved");
  assert(!html.includes("bew-row") && !html.includes("bew-col"), "no editor-only classes leak");
}

// --- Column colors land on the col-N div itself ----------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(2);
      root.append(row);
      row.getColumns()[0].setBgColor("blue-500"); // palette -> class
      row.getColumns()[1].setBgColor("#123456"); // custom -> inline style
    },
    { discrete: true },
  );
  const html = toBootstrapEmailHtml(editor);
  console.log("\nColumn colors:\n" + html + "\n");
  assert(
    html.includes('class="col-6 bg-blue-500"'),
    "palette bg color exports as a class on the col-N div",
  );
  assert(
    html.includes('style="background-color: #123456"'),
    "custom bg color exports as inline style on the col-N div",
  );
}

// setColumnColor operates by key and clears with null
{
  const editor = makeEditor();
  let key;
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(1);
      root.append(row);
      key = row.getColumns()[0].getKey();
    },
    { discrete: true },
  );
  setColumnColor(editor, key, "bg", "green-500");
  flush(editor);
  assert(
    toBootstrapEmailHtml(editor).includes("bg-green-500"),
    "setColumnColor(key, 'bg', token) colors the column",
  );
  setColumnColor(editor, key, "bg", null);
  flush(editor);
  assert(
    !toBootstrapEmailHtml(editor).includes("bg-green-500"),
    "setColumnColor(key, 'bg', null) clears the column color",
  );
}

// --- Operations: add / resize / remove keep the row at 12 ------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(2);
      root.append(row);

      $addColumn(row); // 6·6 + 1 -> 4·4·4
      eqArr(spansOf(row), [4, 4, 4], "add column re-balances 6·6 to 4·4·4");

      $setColumnSpan(row.getColumns()[0], 6); // 4·4·4 -> 6·3·3
      eqArr(spansOf(row), [6, 3, 3], "resize a column re-balances the siblings");

      $removeColumn(row.getColumns()[0]); // back to 2 columns -> 6·6
      eqArr(spansOf(row), [6, 6], "remove column re-balances survivors to 6·6");
    },
    { discrete: true },
  );
}

// --- Every column keeps a paragraph; removing the last column drops the row -
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(3);
      root.append(row);
      assert(
        row.getColumns().every((c) => c.getChildrenSize() >= 1),
        "each column is seeded with a paragraph",
      );
    },
    { discrete: true },
  );

  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(1);
      root.append(row);
      $removeColumn(row.getColumns()[0]);
      assert(
        $getRoot().getChildren().every((n) => n.getType() !== "bootstrap-row"),
        "removing the last column removes the whole row",
      );
    },
    { discrete: true },
  );
}

// --- Add is capped at 12 columns -------------------------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const row = $createGridRow(12);
      root.append(row);
      $addColumn(row); // no-op at the cap
      assert(row.getColumns().length === 12, "cannot add beyond 12 columns");
      eqArr(spansOf(row), new Array(12).fill(1), "12 columns are all col-1");
    },
    { discrete: true },
  );
}

console.log(`\nAll ${count} assertions passed.`);
