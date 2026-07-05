// Headless check: color conversions, node color export, apply targeting, and
// the demo formatter's inline-color -> class conversion.
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
const { $applyColor } = await import("../src/nodes/applyColor.ts");
const { getLastButtonStyle } = await import("../src/nodes/buttonMemory.ts");
const { tokenToHex, tokenToClass, hexToToken } = await import("../src/colors.ts");
const { cleanBootstrapHtml } = await import("../src/export.ts");

let count = 0;
const assert = (cond, msg) => {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
};

// --- Pure conversions ------------------------------------------------------
assert(tokenToHex("blue-500") === "#0d6efd", "tokenToHex palette");
assert(tokenToHex("#abcdef") === "#abcdef", "tokenToHex passthrough for custom");
assert(tokenToClass("blue-500", "text") === "text-blue-500", "tokenToClass text");
assert(tokenToClass("red-100", "bg") === "bg-red-100", "tokenToClass bg");
assert(tokenToClass("#abcdef", "text") === null, "custom has no class");
assert(hexToToken("#0d6efd") === "primary", "hexToToken prefers base name");
assert(hexToToken("#cfe2ff") === "blue-100", "hexToToken family shade");
assert(hexToToken("#123456") === null, "hexToToken unknown -> null");

const editor = createHeadlessEditor({
  namespace: "verify-color",
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

// --- Node color export -----------------------------------------------------
editor.update(
  () => {
    const root = $getRoot().clear();

    const pPalette = new BootstrapParagraphNode();
    pPalette.append($createTextNode("palette block"));
    pPalette.setTextColor("blue-500");
    pPalette.setBgColor("yellow-100");

    const pCustom = new BootstrapParagraphNode();
    pCustom.append($createTextNode("custom block"));
    pCustom.setTextColor("#123456");

    const btn = $createButtonWithLabel("Buy", { variant: "primary" });
    btn.setBgColor("green-500");
    btn.setBorderColor("blue-700");
    const pBtn = new BootstrapParagraphNode();
    pBtn.append(btn);

    const btnCustom = $createButtonWithLabel("Custom", { variant: "primary" });
    btnCustom.setBorderColor("#abcdef");
    const pBtnCustom = new BootstrapParagraphNode();
    pBtnCustom.append(btnCustom);

    root.append(pPalette, pCustom, pBtn, pBtnCustom);
  },
  { discrete: true },
);

let html = "";
editor.getEditorState().read(() => {
  html = $generateHtmlFromNodes(editor, null);
});

assert(
  /<div class="text-blue-500 bg-yellow-100">/.test(html),
  "block palette colors -> text-*/bg-* classes",
);
assert(
  /<div[^>]*style="color: #123456">/.test(html),
  "block custom color -> inline style",
);
assert(
  /class="btn btn-primary bg-green-500 border-blue-700"/.test(html),
  "button palette bg + border -> bg-*/border-* classes alongside btn",
);
assert(
  /class="btn btn-primary"[^>]*style="border-color: #abcdef"/.test(html),
  "button custom border -> inline border-color style",
);

// --- $applyColor targeting (selection set fresh in the same update) --------
// Collapsed selection colors the enclosing block.
let paraKey;
let btnKey;
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const text = $createTextNode("hello");
    p.append(text);
    paraKey = p.getKey();
    root.append(p);
    text.select(5, 5); // collapsed at end
    $applyColor("text", "green-500");
  },
  { discrete: true },
);
editor.getEditorState().read(() => {
  const p = editor.getEditorState()._nodeMap.get(paraKey);
  assert(p.getTextColor() === "green-500", "collapsed selection -> block textColor");
});

// Cursor inside a button colors the button.
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const btn = $createButtonWithLabel("Go", { variant: "primary" });
    btnKey = btn.getKey();
    p.append(btn);
    root.append(p);
    btn.getFirstChild().select(0, 2); // selection inside the button label
    $applyColor("bg", "red-500");
    $applyColor("border", "dark");
  },
  { discrete: true },
);
editor.getEditorState().read(() => {
  const btn = editor.getEditorState()._nodeMap.get(btnKey);
  assert(btn.getBgColor() === "red-500", "selection in button -> button bgColor");
  assert(btn.getBorderColor() === "dark", "selection in button -> button borderColor");
});
// Button styling is remembered for the next insert.
const remembered = getLastButtonStyle();
assert(
  remembered.bgColor === "red-500" && remembered.borderColor === "dark",
  "button styling remembered after color change",
);

// Non-empty text selection -> inline styled span.
let spanKey;
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const text = $createTextNode("colored words");
    p.append(text);
    root.append(p);
    text.select(0, 7);
    $applyColor("text", "red-500");
  },
  { discrete: true },
);
let spanHtmlLive = "";
editor.getEditorState().read(() => {
  spanHtmlLive = $generateHtmlFromNodes(editor, null);
});
assert(/rgb\(220, 53, 69\)|#dc3545/.test(spanHtmlLive), "text selection -> inline color span");
void spanKey;

// --- Formatter: rgb() inline color (how browsers serialize spans) -> class -
// blue-300 (#6ea8fe) has no contextual-name collision, so it maps cleanly.
const spanHtml =
  '<div><span style="color: rgb(110, 168, 254); white-space: pre-wrap;">hi</span></div>';
const source = cleanBootstrapHtml(spanHtml);
console.log("\nFormatted span output:\n" + source + "\n");
assert(source.includes('class="text-blue-300"'), "formatter: rgb() color -> text-blue-300 class");
assert(!/rgb\(/.test(source), "formatter: no leftover rgb() for palette color");

// A collision shade (#dc3545 = danger = red-500) maps to the contextual name.
const collide = cleanBootstrapHtml(
  '<div><span style="color: rgb(220, 53, 69);">x</span></div>',
);
assert(collide.includes('class="text-danger"'), "formatter: collision shade -> contextual name");

// Custom color stays inline as clean hex.
const custom = cleanBootstrapHtml(
  '<div><span style="color: rgb(18, 52, 86);">y</span></div>',
);
assert(custom.includes('style="color: #123456"'), "formatter: custom color -> inline hex");

console.log(`\nAll ${count} assertions passed.`);
