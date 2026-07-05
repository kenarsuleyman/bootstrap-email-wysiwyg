// Headless check: font-size scale stepping, node export (div class vs button
// inline), $adjustFontSize routing, and the formatter's px -> class conversion.
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
const { $adjustFontSize } = await import("../src/nodes/applyFontSize.ts");
const { getLastButtonStyle } = await import("../src/nodes/buttonMemory.ts");
const { stepFontSize } = await import("../src/fontSize.ts");
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

// --- Pure scale stepping ---------------------------------------------------
assert(stepFontSize(null, 1) === "lg", "no size + increase -> lg (from base)");
assert(stepFontSize(null, -1) === "sm", "no size + decrease -> sm (from base)");
assert(stepFontSize("lg", 1) === "xl", "lg + increase -> xl");
assert(stepFontSize("7xl", 1) === "7xl", "clamps at top");
assert(stepFontSize("xs", -1) === "xs", "clamps at bottom");

const editor = createHeadlessEditor({
  namespace: "verify-fontsize",
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

// --- Node export: block -> class, button -> inline -------------------------
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    p.append($createTextNode("big block"));
    p.setFontSize("2xl");

    const btn = $createButtonWithLabel("Big", { variant: "primary" });
    btn.setFontSize("lg");
    const pBtn = new BootstrapParagraphNode();
    pBtn.append(btn);

    root.append(p, pBtn);
  },
  { discrete: true },
);
let html = "";
editor.getEditorState().read(() => {
  html = $generateHtmlFromNodes(editor, null);
});
assert(/<div class="text-2xl">/.test(html), "block font size -> text-* class");
assert(
  /class="btn btn-primary"[^>]*style="font-size: 18px"/.test(html),
  "button font size -> inline style (not class)",
);

// --- $adjustFontSize routing ----------------------------------------------
let paraKey;
let btnKey;
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const t = $createTextNode("x");
    p.append(t);
    paraKey = p.getKey();
    root.append(p);
    t.select(1, 1); // collapsed
    $adjustFontSize("increase");
  },
  { discrete: true },
);
editor.getEditorState().read(() => {
  const p = editor.getEditorState()._nodeMap.get(paraKey);
  assert(p.getFontSize() === "lg", "collapsed selection -> block font size lg");
});

editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const btn = $createButtonWithLabel("Go", { variant: "primary" });
    btnKey = btn.getKey();
    p.append(btn);
    root.append(p);
    btn.getFirstChild().select(0, 2);
    $adjustFontSize("decrease");
  },
  { discrete: true },
);
editor.getEditorState().read(() => {
  const btn = editor.getEditorState()._nodeMap.get(btnKey);
  assert(btn.getFontSize() === "sm", "selection in button -> button font size sm");
});
assert(
  getLastButtonStyle().fontSize === "sm",
  "button font size remembered for next insert",
);

// Text selection -> inline font-size span.
editor.update(
  () => {
    const root = $getRoot().clear();
    const p = new BootstrapParagraphNode();
    const t = $createTextNode("words here");
    p.append(t);
    root.append(p);
    t.select(0, 5);
    $adjustFontSize("increase");
  },
  { discrete: true },
);
let spanHtml = "";
editor.getEditorState().read(() => {
  spanHtml = $generateHtmlFromNodes(editor, null);
});
assert(/font-size: 18px/.test(spanHtml), "text selection -> inline font-size span");

// --- Formatter: span px -> class; button anchor stays inline ---------------
const spanSource = cleanBootstrapHtml(
  '<div><span style="font-size: 24px; white-space: pre-wrap;">hi</span></div>',
);
assert(spanSource.includes('class="text-2xl"'), "formatter: span px -> text-2xl class");

const btnSource = cleanBootstrapHtml(
  '<div><a href="#" class="btn btn-primary" style="font-size: 18px">Go</a></div>',
);
console.log("\nButton source:\n" + btnSource + "\n");
assert(
  btnSource.includes('style="font-size: 18px"') && !/btn[^"]*text-lg/.test(btnSource),
  "formatter: button font size stays inline (no size class)",
);

console.log(`\nAll ${count} assertions passed.`);
