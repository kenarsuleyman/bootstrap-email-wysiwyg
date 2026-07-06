// Headless check of inline links: URL normalization / safety gating, LinkNode
// exporting as a clean inline <a href>, new-link insertion with display text,
// and the button-link path (a button is itself an <a>, so its own href is set
// rather than nesting a second anchor). Image linking and the popover UI are
// exercised in the browser demo.
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
const { LinkNode, $createLinkNode } = await import("@lexical/link");
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);
const { ButtonNode, $createButtonWithLabel } = await import(
  "../src/nodes/ButtonNode.ts"
);
const { setButtonHref } = await import("../src/nodes/insertButton.ts");
const { insertLinkWithText, normalizeLinkUrl, isSafeLinkUrl } = await import(
  "../src/nodes/insertLink.ts"
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
const eq = (a, b, msg) => assert(a === b, `${msg} (got ${JSON.stringify(a)})`);

// Force pending updates to commit. Headless editors defer some updates (e.g.
// $insertNodes normalization) past the synchronous call, so a discrete no-op
// flush makes an immediate read deterministic. (In the browser, editor.update
// commits synchronously and the change listener already sees the final state.)
const flush = (editor) => editor.update(() => {}, { discrete: true });

function makeEditor() {
  return createHeadlessEditor({
    namespace: "verify-link",
    nodes: [
      LinkNode,
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

// --- normalizeLinkUrl ------------------------------------------------------
eq(normalizeLinkUrl("example.com"), "https://example.com", "bare domain -> https://");
eq(normalizeLinkUrl("  example.com  "), "https://example.com", "trims whitespace");
eq(normalizeLinkUrl("https://x.io"), "https://x.io", "explicit scheme untouched");
eq(normalizeLinkUrl("mailto:a@b.com"), "mailto:a@b.com", "mailto untouched");
eq(normalizeLinkUrl("/path"), "/path", "root-relative untouched");
eq(normalizeLinkUrl("#anchor"), "#anchor", "anchor untouched");

// --- isSafeLinkUrl (blocks script-y schemes) -------------------------------
assert(isSafeLinkUrl("https://example.com"), "https is safe");
assert(isSafeLinkUrl("example.com"), "bare domain is safe");
assert(isSafeLinkUrl("mailto:a@b.com"), "mailto is safe");
assert(isSafeLinkUrl("tel:+15551234"), "tel is safe");
assert(isSafeLinkUrl("/relative"), "root-relative is safe");
assert(isSafeLinkUrl("#anchor"), "anchor is safe");
assert(!isSafeLinkUrl("javascript:alert(1)"), "javascript: rejected");
assert(!isSafeLinkUrl("data:text/html,x"), "data: rejected");
assert(!isSafeLinkUrl("   "), "empty rejected");

// --- Export: LinkNode -> clean inline <a href> -----------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const p = new BootstrapParagraphNode();
      p.append($createTextNode("Visit "));
      const link = $createLinkNode("https://example.com");
      link.append($createTextNode("our site"));
      p.append(link);
      root.append(p);
    },
    { discrete: true },
  );

  const fragment = toBootstrapEmailHtml(editor);
  console.log("\nLink:\n" + fragment + "\n");
  assert(
    fragment.includes('<a href="https://example.com">our site</a>'),
    "link exports as inline <a href>",
  );
  assert(!fragment.includes("bew-link"), "no editor-only class leaks into export");
  assert(!fragment.includes("<span"), "no leftover spans");
}

// --- insertLinkWithText: new link at a collapsed cursor --------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const p = new BootstrapParagraphNode();
      root.append(p);
      p.selectEnd(); // collapsed cursor in an empty line
    },
    { discrete: true },
  );
  insertLinkWithText(editor, "example.com/docs", "Read the docs");
  flush(editor);
  const html = toBootstrapEmailHtml(editor);
  console.log("Insert w/ text:\n" + html + "\n");
  assert(
    html.includes('<a href="https://example.com/docs">Read the docs</a>'),
    "inserts a link with the given display text",
  );
}

// display text falls back to the URL when omitted
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const p = new BootstrapParagraphNode();
      root.append(p);
      p.selectEnd();
    },
    { discrete: true },
  );
  insertLinkWithText(editor, "https://only-url.com", "");
  flush(editor);
  assert(
    toBootstrapEmailHtml(editor).includes(
      '<a href="https://only-url.com">https://only-url.com</a>',
    ),
    "empty display text falls back to the URL",
  );
}

// --- Button link: sets the button's own href, no nested <a> ----------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const root = $getRoot().clear();
      const p = new BootstrapParagraphNode();
      const btn = $createButtonWithLabel("Shop", { variant: "primary" });
      p.append(btn);
      root.append(p);
      btn.getFirstChild().select(0, 4); // selection inside the button label
    },
    { discrete: true },
  );

  setButtonHref(editor, "example.com/sale");
  flush(editor);
  const btnHtml = toBootstrapEmailHtml(editor);
  console.log("Button link:\n" + btnHtml + "\n");
  assert(
    btnHtml.includes('href="https://example.com/sale"'),
    "button link sets the button's own href",
  );
  assert(!/<a\b[^>]*>\s*<a\b/i.test(btnHtml), "no nested <a> inside the button");
  assert(
    (btnHtml.match(/<a\b/gi) || []).length === 1,
    "button renders exactly one anchor",
  );

  // unsafe URL is ignored (href unchanged)
  setButtonHref(editor, "javascript:alert(1)");
  flush(editor);
  assert(
    toBootstrapEmailHtml(editor).includes('href="https://example.com/sale"'),
    "unsafe button URL is rejected (href unchanged)",
  );

  // empty URL resets to "#"
  setButtonHref(editor, "");
  flush(editor);
  assert(
    toBootstrapEmailHtml(editor).includes('href="#"'),
    "empty button URL resets href to #",
  );
}

console.log(`\nAll ${count} assertions passed.`);
