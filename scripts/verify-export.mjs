// Headless check of the Tier 1 export API: toBootstrapEmailHtml (fragment /
// document / pretty) and the initialContent (JSON) round-trip.
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
const { ButtonNode, $createButtonWithLabel } = await import(
  "../src/nodes/ButtonNode.ts"
);
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);
const { toBootstrapEmailHtml } = await import("../src/export.ts");
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
    namespace: "verify-export",
    nodes: [
      ButtonNode,
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

const editor = makeEditor();
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    p.append($createTextNode("Hello world"));
    p.setFormat("center");
    p.setTextColor("blue-500");
    const pBtn = new BootstrapParagraphNode();
    pBtn.append($createButtonWithLabel("Shop", { variant: "primary" }));
    root.append(p, pBtn);
  },
  { discrete: true },
);

// --- Fragment (default) ----------------------------------------------------
const fragment = toBootstrapEmailHtml(editor);
console.log("\nFragment:\n" + fragment + "\n");
assert(
  fragment.includes('<div class="text-center text-blue-500">Hello world</div>'),
  "fragment: clean class-based div (no spans)",
);
assert(!fragment.includes("<span"), "fragment: no leftover spans");
assert(fragment.includes('class="btn btn-primary"'), "fragment: button preserved");
assert(!fragment.startsWith("<!DOCTYPE"), "fragment: not a full document");

// --- Full document ---------------------------------------------------------
const doc = toBootstrapEmailHtml(editor, { document: true });
console.log("Document:\n" + doc + "\n");
assert(doc.startsWith("<!DOCTYPE html>"), "document: has doctype");
assert(doc.includes('<div class="container">'), "document: wraps in .container");
assert(doc.includes("Hello world"), "document: contains content");

// --- pretty: false ---------------------------------------------------------
const compact = toBootstrapEmailHtml(editor, { pretty: false });
assert(!compact.includes("\n"), "pretty:false -> single line");
assert(compact.includes('<div class="text-center text-blue-500">'), "compact still class-based");

// --- initialContent round-trip (JSON) --------------------------------------
const json = JSON.stringify(editor.getEditorState().toJSON());
const editor2 = makeEditor();
editor2.setEditorState(editor2.parseEditorState(json));
const fragment2 = toBootstrapEmailHtml(editor2);
assert(fragment2 === fragment, "initialContent JSON round-trips to same HTML");

// --- Text formats export clean, without editor theme classes ---------------
// Uses the real theme so Lexical stamps `bew-text-*` classes; the exporter must
// strip them (plus the white-space wrapper style and redundant double-wrapping).
{
  const themed = createHeadlessEditor({
    namespace: "verify-export-fmt",
    theme: bootstrapEmailTheme,
    nodes: [
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
  const cases = {
    bold: "<div><strong>X</strong></div>",
    italic: "<div><em>X</em></div>",
    underline: "<div><u>X</u></div>",
    strikethrough: "<div><s>X</s></div>",
  };
  for (const [fmt, expected] of Object.entries(cases)) {
    themed.update(
      () => {
        const p = new BootstrapParagraphNode();
        const t = $createTextNode("X");
        t.setFormat(fmt);
        p.append(t);
        $getRoot().clear().append(p);
      },
      { discrete: true },
    );
    const html = toBootstrapEmailHtml(themed, { pretty: false });
    assert(html === expected, `${fmt} exports as ${expected} (got ${html})`);
  }
  // Combined formats nest cleanly; still no theme class or white-space leak.
  themed.update(
    () => {
      const p = new BootstrapParagraphNode();
      const t = $createTextNode("X");
      t.setFormat("bold");
      t.toggleFormat("italic");
      p.append(t);
      $getRoot().clear().append(p);
    },
    { discrete: true },
  );
  const combo = toBootstrapEmailHtml(themed, { pretty: false });
  assert(
    combo === "<div><em><strong>X</strong></em></div>",
    `combined formats nest cleanly (got ${combo})`,
  );
  assert(!combo.includes("bew-"), "no editor theme class leaks into export");
  assert(!combo.includes("white-space"), "no white-space wrapper style leaks");
  assert(!/<\/?[bi]>/.test(combo), "uses Bootstrap <strong>/<em>, not <b>/<i>");
}

console.log(`\nAll ${count} assertions passed.`);
