// Headless check: alignment + block type export to Bootstrap Email markup.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const { $generateHtmlFromNodes } = await import("@lexical/html");
const { $getRoot, $createTextNode, ParagraphNode } = await import("lexical");
const { ButtonNode, $createButtonWithLabel } = await import(
  "../src/nodes/ButtonNode.ts"
);
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);

const editor = createHeadlessEditor({
  namespace: "verify-align",
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

let count = 0;
function assert(cond, msg) {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
}

editor.update(
  () => {
    const root = $getRoot().clear();

    // 1. Plain paragraph -> <div>
    const p1 = new BootstrapParagraphNode();
    p1.append($createTextNode("Left default line"));

    // 2. Centered text paragraph -> <div class="text-center">
    const p2 = new BootstrapParagraphNode();
    p2.append($createTextNode("Centered text"));
    p2.setFormat("center");

    // 3. Right-justified text -> <div class="text-justify"> (justify)
    const p3 = new BootstrapParagraphNode();
    p3.append($createTextNode("Justified text"));
    p3.setFormat("justify");

    // 4. Centered button block -> <div class="ax-center"><a class="btn ...">
    const pBtn = new BootstrapParagraphNode();
    pBtn.append($createButtonWithLabel("Shop", { variant: "primary" }));
    pBtn.setFormat("center");

    root.append(p1, p2, p3, pBtn);
  },
  { discrete: true },
);

let html = "";
editor.getEditorState().read(() => {
  html = $generateHtmlFromNodes(editor, null);
});
console.log("\nExported HTML:\n" + html + "\n");

assert(/<div>[^<]*<[^>]*>Left default line/.test(html), "plain line -> bare <div>");
assert(html.includes('<div class="text-center">'), "centered text -> text-center div");
assert(html.includes('<div class="text-justify">'), "justified text -> text-justify div");
assert(html.includes('<div class="ax-center">'), "centered button block -> ax-center div");
assert(
  /<div class="ax-center"><a[^>]*class="btn btn-primary"/.test(html),
  "ax-center wraps the raw <a class=btn> (no text-*)",
);
assert(!html.includes("ax-justify"), "buttons never get ax-justify");

console.log(`\nAll ${count} assertions passed.`);
