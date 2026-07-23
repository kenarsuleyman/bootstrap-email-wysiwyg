// Headless check of merge tags used as link hrefs: URL validation accepts
// `{{key}}`, and a merge-tag href survives to export on buttons, inline text
// links, and image links.
import { register } from "node:module";
import { JSDOM } from "jsdom";

// ImageNode is a React component that imports its CSS; stub it out.
register("./css-loader.mjs", import.meta.url);

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.Node = dom.window.Node;

const { createHeadlessEditor } = await import("@lexical/headless");
const { $getRoot, $createTextNode, ParagraphNode } = await import("lexical");
const { LinkNode } = await import("@lexical/link");
const { BootstrapLinkNode } = await import(
  "../src/nodes/BootstrapLinkNode.ts"
);
const { BootstrapParagraphNode } = await import(
  "../src/nodes/BootstrapParagraphNode.ts"
);
const { ButtonNode, $createButtonWithLabel } = await import(
  "../src/nodes/ButtonNode.ts"
);
const { ImageNode, $createImageNode } = await import(
  "../src/nodes/ImageNode.tsx"
);
const { setButtonHref } = await import("../src/nodes/insertButton.ts");
const { insertLinkWithText, isSafeLinkUrl, normalizeLinkUrl } = await import(
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

function makeEditor() {
  return createHeadlessEditor({
    namespace: "verify-mergetag-link",
    nodes: [
      LinkNode,
      BootstrapLinkNode,
      ButtonNode,
      ImageNode,
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

// --- URL validation treats merge tags as opaque-but-safe ------------------
assert(isSafeLinkUrl("{{profile_url}}"), "bare merge tag is a safe link");
assert(
  isSafeLinkUrl("https://x.co/{{id}}"),
  "merge tag embedded in an https URL is safe",
);
assert(isSafeLinkUrl("mailto:{{email}}"), "mailto: with a merge tag is safe");
assert(
  !isSafeLinkUrl("javascript:{{x}}"),
  "javascript: with a merge tag is still rejected",
);
// A bare merge-tag URL must not get an https:// prefix (backend resolves it).
eq(normalizeLinkUrl("{{profile_url}}"), "{{profile_url}}", "bare tag not prefixed");
eq(
  normalizeLinkUrl("example.com/{{id}}"),
  "https://example.com/{{id}}",
  "bare-domain URL with a tag still gets https://",
);

// --- Button href = merge tag ----------------------------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const p = new BootstrapParagraphNode();
      const btn = $createButtonWithLabel("Visit");
      p.append(btn);
      $getRoot().clear().append(p);
      btn.getFirstChild().select(0, 4); // put the caret inside the button
    },
    { discrete: true },
  );
  setButtonHref(editor, "{{profile_url}}");
  editor.update(() => {}, { discrete: true }); // flush
  const html = toBootstrapEmailHtml(editor, { pretty: false });
  console.log("\nButton href:\n" + html + "\n");
  eq(
    html,
    '<div><a href="{{profile_url}}" class="btn btn-primary">Visit</a></div>',
    "button keeps the merge-tag href",
  );
}

// --- Inline text link href = merge tag ------------------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const p = new BootstrapParagraphNode();
      $getRoot().clear().append(p);
      p.selectEnd(); // collapsed cursor in an empty line
    },
    { discrete: true },
  );
  insertLinkWithText(editor, "{{unsubscribe_url}}", "Unsubscribe");
  editor.update(() => {}, { discrete: true }); // flush
  const html = toBootstrapEmailHtml(editor, { pretty: false });
  console.log("Text link:\n" + html + "\n");
  eq(
    html,
    '<div><a href="{{unsubscribe_url}}">Unsubscribe</a></div>',
    "inline link keeps the merge-tag href",
  );
}

// --- Image link = merge tag -----------------------------------------------
{
  const editor = makeEditor();
  editor.update(
    () => {
      const p = new BootstrapParagraphNode();
      const img = $createImageNode({
        src: "https://example.com/logo.png",
        alt: "Logo",
        link: "{{profile_url}}",
      });
      p.append(img);
      $getRoot().clear().append(p);
    },
    { discrete: true },
  );
  const html = toBootstrapEmailHtml(editor, { pretty: false });
  console.log("Image link:\n" + html + "\n");
  assert(
    html.includes('href="{{profile_url}}"'),
    `image link keeps the merge-tag href (got ${html})`,
  );
}

console.log(`\nAll ${count} assertions passed.`);
