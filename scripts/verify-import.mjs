// Headless check of HTML import: the editor must accept the Bootstrap Email
// HTML it produced (`initialHtml` / `setHtml`) and rebuild the same content —
// merge tags as atomic tokens, buttons, images, separators, grids and block
// colors included.
import { register } from "node:module";
import { JSDOM } from "jsdom";

// ImageNode/HrNode are React components that import their CSS; stub it out.
register("./css-loader.mjs", import.meta.url);

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const { $getRoot, $createTextNode, ParagraphNode } = await import("lexical");
const { LinkNode } = await import("@lexical/link");

const { MergeTagNode, $createMergeTagNode, $isMergeTagNode } = await import(
  "../src/nodes/MergeTagNode.ts"
);
const { ButtonNode, $createButtonWithLabel, $isButtonNode } = await import(
  "../src/nodes/ButtonNode.ts"
);
const { ImageNode, $createImageNode, $isImageNode } = await import(
  "../src/nodes/ImageNode.tsx"
);
const { HrNode, $createHrNode, $isHrNode } = await import(
  "../src/nodes/HrNode.tsx"
);
const { RowNode, $createRowNode, $isRowNode } = await import(
  "../src/nodes/RowNode.ts"
);
const { ColumnNode, $createColumnNode, $isColumnNode } = await import(
  "../src/nodes/ColumnNode.ts"
);
const { BootstrapLinkNode } = await import("../src/nodes/BootstrapLinkNode.ts");
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);
const { toBootstrapEmailHtml } = await import("../src/export.ts");
const { fromBootstrapEmailHtml } = await import("../src/import.ts");
const { bootstrapEmailTheme } = await import("../src/theme.ts");

let count = 0;
const assert = (cond, msg) => {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
};

function makeEditor() {
  return createHeadlessEditor({
    namespace: "verify-import",
    theme: bootstrapEmailTheme,
    nodes: [
      ButtonNode,
      ImageNode,
      HrNode,
      LinkNode,
      BootstrapLinkNode,
      RowNode,
      ColumnNode,
      MergeTagNode,
      BootstrapParagraphNode,
      {
        replace: ParagraphNode,
        with: () => new BootstrapParagraphNode(),
        withKlass: BootstrapParagraphNode,
      },
      {
        replace: LinkNode,
        with: (node) =>
          new BootstrapLinkNode(node.getURL(), {
            rel: node.getRel(),
            target: node.getTarget(),
            title: node.getTitle(),
          }),
        withKlass: BootstrapLinkNode,
      },
    ],
    onError: (e) => {
      throw e;
    },
  });
}

/** Import `html` into a fresh editor and re-export it. */
function roundTrip(html) {
  const editor = makeEditor();
  fromBootstrapEmailHtml(editor, html);
  return { editor, html: toBootstrapEmailHtml(editor, { pretty: false }) };
}

/** Import `html`, re-export, and assert the source survived unchanged. */
function assertStable(html, label) {
  const { editor, html: out } = roundTrip(html);
  assert(out === html, `${label}\n      in:  ${html}\n      out: ${out}`);
  return editor;
}

// --- Merge tags: bare {{key}} text becomes an atomic node again ------------
{
  const editor = assertStable(
    "<div>Hi {{first_name}}, welcome</div>",
    "plain merge tag round-trips",
  );
  editor.getEditorState().read(() => {
    const children = $getRoot().getFirstChild().getChildren();
    const tag = children.find($isMergeTagNode);
    assert($isMergeTagNode(tag), "imported {{key}} is a MergeTagNode");
    assert(tag.isToken(), "imported merge tag is atomic (token mode)");
    assert(tag.getMergeKey() === "first_name", "merge key parsed from braces");
    assert(children.length === 3, "surrounding text is kept around the tag");
  });
}

assertStable(
  "<div><strong>{{company}}</strong></div>",
  "bold merge tag round-trips",
);
assertStable(
  '<div><span class="text-primary">{{email}}</span></div>',
  "colored merge tag round-trips",
);
assertStable(
  "<div>{{a}}{{b}}</div>",
  "adjacent merge tags stay separate tokens",
);

// Two tags in one line, both atomic.
{
  const { editor } = roundTrip("<div>{{first_name}} {{last_name}}</div>");
  editor.getEditorState().read(() => {
    const tags = $getRoot().getFirstChild().getChildren().filter($isMergeTagNode);
    assert(tags.length === 2, "both merge tags in a line are imported");
    assert(
      tags.map((t) => t.getMergeKey()).join(",") === "first_name,last_name",
      "keys read in document order",
    );
  });
}

// The editor's own chip markup (a paste of live editor DOM) is recognized too.
{
  const { editor } = roundTrip(
    '<div>Hi <span class="bew-merge-tag">{{first_name}}</span>!</div>',
  );
  editor.getEditorState().read(() => {
    const tag = $getRoot().getFirstChild().getChildren().find($isMergeTagNode);
    assert($isMergeTagNode(tag), "bew-merge-tag chip imports via importDOM");
    assert(tag.getMergeKey() === "first_name", "chip key parsed");
  });
  const out = toBootstrapEmailHtml(editor, { pretty: false });
  assert(
    out === "<div>Hi {{first_name}}!</div>",
    `chip re-exports as bare {{key}} (got ${out})`,
  );
}

// A merge tag used as a link href stays in the href, not split into a node.
assertStable(
  '<div><a href="{{unsubscribe_url}}">Unsubscribe</a></div>',
  "merge-tag href round-trips",
);

// --- Blocks: alignment, colors, font size ---------------------------------
assertStable('<div class="text-center">Centered</div>', "aligned line");
assertStable(
  '<div class="text-primary bg-light">Colored line</div>',
  "block colors",
);
assertStable('<div class="text-2xl">Big line</div>', "block font size");
assertStable(
  '<div style="color: #a1b2c3">Custom color</div>',
  "custom hex block color",
);
assertStable("<div><br></div>", "empty line stays empty");

// --- Inline formatting -----------------------------------------------------
assertStable(
  "<div>Hello <strong>world</strong> and <em>others</em></div>",
  "inline bold/italic",
);
assertStable(
  '<div><span class="text-danger">red</span> text</div>',
  "inline color span",
);
assertStable(
  '<div><a href="https://example.com">link</a></div>',
  "inline link",
);

// --- Buttons ---------------------------------------------------------------
{
  const editor = assertStable(
    '<div class="ax-center"><a href="https://shop.test" class="btn btn-outline-success">Shop {{sku}}</a></div>',
    "button with variant + merge tag",
  );
  editor.getEditorState().read(() => {
    const btn = $getRoot().getFirstChild().getChildren().find($isButtonNode);
    assert($isButtonNode(btn), "button imports as a ButtonNode");
    assert(btn.getHref() === "https://shop.test", "button href kept");
    const tag = btn.getChildren().find($isMergeTagNode);
    assert($isMergeTagNode(tag), "merge tag inside the button label is atomic");
  });
}
assertStable(
  '<div><a href="#" class="btn btn-primary text-white" style="font-size: 20px">Big</a></div>',
  "button color class + inline font size",
);

// --- Images ----------------------------------------------------------------
assertStable(
  '<img src="https://img.test/a.png" alt="A" class="img-fluid">',
  "image",
);
{
  const editor = assertStable(
    '<a href="https://example.com"><img src="https://img.test/a.png" alt="A" class="img-fluid"></a>',
    "linked image (no duplicated anchor)",
  );
  editor.getEditorState().read(() => {
    const img = $getRoot().getChildren().find($isImageNode);
    assert($isImageNode(img), "linked image is a single ImageNode at root");
    assert(img.getLink() === "https://example.com", "image link kept");
  });
}

// --- Separator -------------------------------------------------------------
{
  const source = '<hr class="mt-5 mb-3">';
  const { editor, html } = roundTrip(source);
  assert(html === source, `separator margins round-trip (got ${html})`);
  editor.getEditorState().read(() => {
    assert($isHrNode($getRoot().getChildren().find($isHrNode)), "hr is an HrNode");
  });
}

// --- Grid ------------------------------------------------------------------
{
  const grid =
    '<div class="row"><div class="col-8 bg-light"><div>Left</div></div>' +
    '<div class="col-4"><div>Right {{n}}</div></div></div>';
  const editor = assertStable(grid, "grid row/columns with spans + colors");
  editor.getEditorState().read(() => {
    const row = $getRoot().getChildren().find($isRowNode);
    assert($isRowNode(row), "row imports as a RowNode");
    const cols = row.getChildren().filter($isColumnNode);
    assert(cols.length === 2, "both columns imported");
    assert(
      cols.map((c) => c.getSpan()).join(",") === "8,4",
      "column spans preserved",
    );
    assert(cols[0].getBgColor() === "light", "column background color kept");
  });
}

// --- Full-document export imports back to the same fragment ---------------
{
  const source = makeEditor();
  source.update(
    () => {
      const p = new BootstrapParagraphNode();
      p.append(
        $createTextNode("Hi "),
        $createMergeTagNode("first_name"),
        $createTextNode("!"),
      );
      const q = new BootstrapParagraphNode();
      q.append($createButtonWithLabel("Shop"));
      q.setFormat("center");
      const r = new BootstrapParagraphNode();
      r.append($createImageNode({ src: "https://img.test/a.png", alt: "A" }));
      $getRoot()
        .clear()
        .append(p, q, $createHrNode(), r);
    },
    { discrete: true },
  );

  const fragment = toBootstrapEmailHtml(source, { pretty: false });
  const document_ = toBootstrapEmailHtml(source, { document: true });
  console.log("\nSource fragment:\n" + fragment + "\n");

  const { html: fromFragment } = roundTrip(fragment);
  assert(
    fromFragment === fragment,
    `mixed content round-trips\n      in:  ${fragment}\n      out: ${fromFragment}`,
  );

  const { html: fromDocument } = roundTrip(document_);
  assert(
    fromDocument === fragment,
    `full document import unwraps .container\n      out: ${fromDocument}`,
  );
}

// --- Empty / garbage input -------------------------------------------------
{
  const { editor, html } = roundTrip("");
  assert(html === "<div><br></div>", `empty HTML yields one empty line (got ${html})`);
  editor.getEditorState().read(() => {
    assert($getRoot().getChildrenSize() === 1, "root is never left empty");
  });
}
{
  const { html } = roundTrip("Bare text");
  assert(
    html === "<div>Bare text</div>",
    `top-level text is wrapped in a line (got ${html})`,
  );
}

console.log(`\nAll ${count} assertions passed.`);
