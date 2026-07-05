// Headless round-trip check for ButtonNode: insert → export HTML → import HTML.
import { JSDOM } from "jsdom";

// Lexical's DOM export/import needs a browser-like global environment.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const { $generateHtmlFromNodes, $generateNodesFromDOM } = await import(
  "@lexical/html"
);
const { $getRoot, $insertNodes, $createParagraphNode } = await import(
  "lexical"
);
const { ButtonNode, $createButtonWithLabel, $isButtonNode } = await import(
  "../src/nodes/ButtonNode.ts"
);

const editor = createHeadlessEditor({
  namespace: "verify",
  nodes: [ButtonNode],
  onError: (e) => {
    throw e;
  },
});

let assertions = 0;
function assert(cond, msg) {
  assertions++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
}

// 1. Insert a button and export to HTML.
editor.update(
  () => {
    const btn = $createButtonWithLabel("Shop now", {
      href: "https://example.com",
      variant: "success",
    });
    // Buttons are inline, so they live inside a block (paragraph).
    const paragraph = $createParagraphNode().append(btn);
    $getRoot().clear().append(paragraph);
  },
  { discrete: true },
);

let html = "";
editor.getEditorState().read(() => {
  html = $generateHtmlFromNodes(editor, null);
});
console.log("\nExported HTML:\n" + html + "\n");

assert(html.includes('class="btn btn-success"'), "exports btn + variant class");
assert(html.includes('href="https://example.com"'), "exports href");
assert(html.includes(">Shop now<"), "exports label text");

// 2. Re-import that HTML and confirm the node round-trips.
editor.update(
  () => {
    const parsed = new dom.window.DOMParser().parseFromString(
      html,
      "text/html",
    );
    const nodes = $generateNodesFromDOM(editor, parsed);
    $getRoot().clear();
    $insertNodes(nodes);
  },
  { discrete: true },
);

editor.getEditorState().read(() => {
  const found = $getRoot()
    .getAllTextNodes()
    .map((n) => n.getParent())
    .find($isButtonNode);
  assert(!!found, "re-imports as a ButtonNode");
  assert(found.getVariant() === "success", "preserves variant on import");
  assert(
    found.getHref() === "https://example.com",
    "preserves href on import",
  );
});

// 3. JSON serialization round-trip.
const json = JSON.stringify(editor.getEditorState().toJSON());
assert(json.includes('"type":"bootstrap-button"'), "serializes to JSON");
const restored = editor.parseEditorState(json);
restored.read(() => {
  const found = $getRoot()
    .getAllTextNodes()
    .map((n) => n.getParent())
    .find($isButtonNode);
  assert(!!found && found.getVariant() === "success", "JSON round-trips");
});

console.log(`\nAll ${assertions} assertions passed.`);
