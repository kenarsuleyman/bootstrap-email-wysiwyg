// Headless check of merge tags: atomic token behavior, styling passes through,
// clean `{{key}}` export, and the JSON round-trip.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const {
  $getRoot,
  $createTextNode,
  $createRangeSelection,
  $setSelection,
  ParagraphNode,
} = await import("lexical");
const { $patchStyleText } = await import("@lexical/selection");
const { MergeTagNode, $createMergeTagNode, $isMergeTagNode } = await import(
  "../src/nodes/MergeTagNode.ts"
);
const { insertMergeTag } = await import("../src/nodes/insertMergeTag.ts");
const { ButtonNode, $createButtonWithLabel, $isButtonNode } = await import(
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
    namespace: "verify-mergetag",
    theme: bootstrapEmailTheme,
    nodes: [
      MergeTagNode,
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

/** Seed a paragraph holding a single button with the given label, select part
 *  of the label ([a, f) offsets), then insert a merge tag via insertMergeTag. */
function buttonInsert(label, a, f, key) {
  editor.update(
    () => {
      const p = new BootstrapParagraphNode();
      const btn = $createButtonWithLabel(label);
      $getRoot().clear().append(p);
      p.append(btn);
      const t = btn.getFirstChild();
      const sel = $createRangeSelection();
      sel.anchor.set(t.getKey(), a, "text");
      sel.focus.set(t.getKey(), f, "text");
      $setSelection(sel);
    },
    { discrete: true },
  );
  insertMergeTag(editor, key);
  editor.update(() => {}, { discrete: true }); // flush
  return toBootstrapEmailHtml(editor, { pretty: false });
}

const editor = makeEditor();

// --- Node shape: token mode, text, key ------------------------------------
editor.update(
  () => {
    const p = new BootstrapParagraphNode();
    p.append(
      $createTextNode("Hi "),
      $createMergeTagNode("first_name"),
      $createTextNode(", welcome"),
    );
    $getRoot().clear().append(p);
  },
  { discrete: true },
);

editor.getEditorState().read(() => {
  const p = $getRoot().getFirstChild();
  const tag = p.getChildren().find($isMergeTagNode);
  assert(tag !== undefined, "merge tag node exists in the tree");
  assert(tag.getTextContent() === "{{first_name}}", "renders as {{first_name}}");
  assert(tag.getMergeKey() === "first_name", "getMergeKey() returns bare key");
  assert(tag.getMode() === "token", "is in token mode (atomic)");
  assert(tag.isToken() === true, "isToken() is true — never splits/merges");
});

// --- Clean export: {{key}} survives as literal text -----------------------
const html = toBootstrapEmailHtml(editor, { pretty: false });
console.log("\nExport:\n" + html + "\n");
assert(
  html === "<div>Hi {{first_name}}, welcome</div>",
  `exports {{key}} inline as plain text (got ${html})`,
);
assert(!html.includes("bew-"), "no editor chip class leaks into export");
assert(!html.includes("<span"), "no leftover span around the tag");

// --- Styling passes through: color wraps the whole tag, key intact --------
editor.update(
  () => {
    const p = new BootstrapParagraphNode();
    const tag = $createMergeTagNode("email");
    p.append(tag);
    $getRoot().clear().append(p);
    const sel = $createRangeSelection();
    sel.anchor.set(tag.getKey(), 0, "text");
    sel.focus.set(tag.getKey(), tag.getTextContent().length, "text");
    $setSelection(sel);
    $patchStyleText(sel, { color: "#0d6efd" });
  },
  { discrete: true },
);
const styled = toBootstrapEmailHtml(editor, { pretty: false });
console.log("Styled:\n" + styled + "\n");
assert(
  styled === '<div><span class="text-primary">{{email}}</span></div>',
  `colored tag: whole {{key}} wrapped, palette class-ified (got ${styled})`,
);

// --- Bold format wraps the whole tag --------------------------------------
editor.update(
  () => {
    const p = new BootstrapParagraphNode();
    const tag = $createMergeTagNode("company");
    tag.setFormat("bold");
    p.append(tag);
    $getRoot().clear().append(p);
  },
  { discrete: true },
);
const bold = toBootstrapEmailHtml(editor, { pretty: false });
assert(
  bold === "<div><strong>{{company}}</strong></div>",
  `bold tag exports as <strong>{{company}}</strong> (got ${bold})`,
);

// --- JSON round-trip preserves the tag (type, key, token mode) ------------
editor.update(
  () => {
    const p = new BootstrapParagraphNode();
    p.append($createTextNode("A "), $createMergeTagNode("last_name"));
    $getRoot().clear().append(p);
  },
  { discrete: true },
);
const before = toBootstrapEmailHtml(editor, { pretty: false });
const json = JSON.stringify(editor.getEditorState().toJSON());
assert(json.includes('"type":"merge-tag"'), "serializes with type merge-tag");
assert(json.includes('"mergeKey":"last_name"'), "serializes the mergeKey");

const editor2 = makeEditor();
editor2.setEditorState(editor2.parseEditorState(json));
const after = toBootstrapEmailHtml(editor2, { pretty: false });
assert(after === before, "JSON round-trips to identical HTML");
editor2.getEditorState().read(() => {
  const tag = $getRoot()
    .getFirstChild()
    .getChildren()
    .find($isMergeTagNode);
  assert($isMergeTagNode(tag), "restored node is a MergeTagNode");
  assert(tag.isToken() === true, "restored node is still token mode");
});

// --- Merge tags + buttons (the reported bugs) -----------------------------
// Full-label select → tag replaces the label, button survives.
{
  const html = buttonInsert("Buy now", 0, 7, "first_name");
  console.log("Button full-select:\n" + html + "\n");
  assert(
    html === '<div><a href="#" class="btn btn-primary">{{first_name}}</a></div>',
    `full label → button kept, label = {{first_name}} (got ${html})`,
  );
}

// Partial select → only the selected part is replaced, tag stays in the button.
{
  const html = buttonInsert("Buy now", 1, 3, "first_name");
  console.log("Button partial-select:\n" + html + "\n");
  assert(
    html === '<div><a href="#" class="btn btn-primary">B{{first_name}} now</a></div>',
    `partial label → tag spliced inside button (got ${html})`,
  );
}

// Collapsed caret inside the button → tag inserted as label text, button kept.
{
  const html = buttonInsert("Buy now", 3, 3, "email");
  console.log("Button collapsed:\n" + html + "\n");
  assert(
    html === '<div><a href="#" class="btn btn-primary">Buy{{email}} now</a></div>',
    `collapsed caret → tag inside button label (got ${html})`,
  );
}

// The tag inside a button really is a MergeTagNode child of the button.
editor.getEditorState().read(() => {
  const btn = $getRoot().getFirstChild().getChildren().find($isButtonNode);
  assert($isButtonNode(btn), "button still present after insert");
  const tag = btn.getChildren().find($isMergeTagNode);
  assert($isMergeTagNode(tag) && tag.isToken(), "tag is a token child of button");
});

console.log(`\nAll ${count} assertions passed.`);
