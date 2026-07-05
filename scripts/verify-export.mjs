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

console.log(`\nAll ${count} assertions passed.`);
