// Confirms the demo's source formatter cleans + pretty-prints Lexical HTML.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;

const { cleanBootstrapHtml } = await import("../src/export.ts");

const raw =
  '<div><span style="white-space: pre-wrap;">Hello </span>' +
  '<strong><span style="white-space: pre-wrap;">world</span></strong></div>' +
  '<h2 class="text-center"><span style="white-space: pre-wrap;">Title</span></h2>' +
  '<div class="ax-center"><a href="#" class="btn btn-primary">' +
  '<span style="white-space: pre-wrap;">Shop</span></a></div>' +
  "<div><br></div>";

const out = cleanBootstrapHtml(raw);
console.log("Formatted output:\n" + out + "\n");

let count = 0;
const assert = (cond, msg) => {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
};

assert(!out.includes("white-space"), "strips Lexical text-wrapper spans");
assert(!out.includes("<span"), "no leftover spans");
assert(out.includes("<div>Hello <strong>world</strong></div>"), "keeps inline formatting");
assert(out.includes('<h2 class="text-center">Title</h2>'), "keeps heading + align class");
assert(
  out.includes('<div class="ax-center"><a href="#" class="btn btn-primary">Shop</a></div>'),
  "keeps ax-center button block",
);
assert(out.includes("<div><br></div>"), "keeps empty line");
assert(out.split("\n").length === 4, "one block per line");

console.log(`\nAll ${count} assertions passed.`);
