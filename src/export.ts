import { $generateHtmlFromNodes } from "@lexical/html";
import type { LexicalEditor } from "lexical";

import { hexToToken, tokenToClass } from "./colors";
import { fontSizeClass, pxToFontSizeKey } from "./fontSize";

// Produces Bootstrap Email source from the editor: it takes Lexical's raw HTML
// export and converts inline colors/sizes into Bootstrap Email classes, strips
// Lexical's text-wrapper spans, and (optionally) pretty-prints and wraps the
// result in a full email document.

export interface BootstrapEmailHtmlOptions {
  /** Wrap the content in a full HTML email document. Default: false (fragment). */
  document?: boolean;
  /** Pretty-print with indentation. Default: true. */
  pretty?: boolean;
}

const BLOCK_TAGS = new Set([
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TD",
  "TH",
  "UL",
  "OL",
  "LI",
]);

const VOID_TAGS = new Set(["BR", "HR", "IMG"]);

function attrString(el: Element): string {
  return Array.from(el.attributes)
    .map((attr) => ` ${attr.name}="${attr.value}"`)
    .join("");
}

/** Normalize a CSS color to lowercase `#rrggbb` (browsers serialize as rgb()). */
function toHex(value: string): string {
  const v = value.trim().toLowerCase();
  const match = v.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return v;
  const [r, g, b] = match[1].split(",").map((part) => part.trim());
  const channel = (n: string) =>
    Math.max(0, Math.min(255, parseInt(n, 10)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Convert inline `color` / `background-color` / `border-color` into Bootstrap
 * Email classes when the value is a palette color (custom colors stay inline as
 * hex), and inline `font-size` into `text-*` size classes.
 *
 * Font size is left inline on button anchors, where the size class would be
 * overridden by `.btn td a` after compilation.
 */
function convertInlineStyles(root: Element): void {
  root.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const isButtonAnchor = el.tagName === "A" && el.classList.contains("btn");
    const declarations = (el.getAttribute("style") ?? "")
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);

    const remaining: string[] = [];
    for (const declaration of declarations) {
      const [propRaw, ...rest] = declaration.split(":");
      const prop = propRaw.trim().toLowerCase();
      const value = rest.join(":").trim();

      // Lexical stamps `white-space: pre-wrap` on text wrappers for editing;
      // it carries no meaning in the exported email, so drop it everywhere.
      if (prop === "white-space") continue;

      const colorKind =
        prop === "color"
          ? "text"
          : prop === "background-color"
            ? "bg"
            : prop === "border-color"
              ? "border"
              : null;
      if (colorKind) {
        const hex = toHex(value);
        const token = hexToToken(hex);
        const cls = token ? tokenToClass(token, colorKind) : null;
        if (cls) el.classList.add(cls);
        else remaining.push(`${prop}: ${hex}`);
        continue;
      }

      if (prop === "font-size" && !isButtonAnchor) {
        const cls = fontSizeClass(pxToFontSizeKey(parseInt(value, 10)));
        if (cls) {
          el.classList.add(cls);
          continue;
        }
      }
      remaining.push(declaration);
    }

    if (remaining.length) el.setAttribute("style", remaining.join("; "));
    else el.removeAttribute("style");
  });
}

/** Remove editor-only theme classes (`bew-*`), dropping empty class attributes. */
function stripEditorClasses(root: Element): void {
  root.querySelectorAll("[class]").forEach((el) => {
    const kept = Array.from(el.classList).filter((cls) => !cls.startsWith("bew-"));
    if (kept.length) el.setAttribute("class", kept.join(" "));
    else el.removeAttribute("class");
  });
}

// Formatting tags that mean the same thing, so a nested pair is redundant.
const FORMAT_GROUP: Record<string, string> = {
  B: "bold",
  STRONG: "bold",
  I: "italic",
  EM: "italic",
  U: "underline",
  INS: "underline",
  S: "strike",
  STRIKE: "strike",
  DEL: "strike",
};

/**
 * Unwrap the redundant inline wrappers Lexical produces: bare text `<span>`s,
 * and a formatting tag nested directly inside a synonymous one — e.g.
 * `<b><strong>x</strong></b>` → `<b>x</b>`, `<u><span>x</span></u>` → `<u>x</u>`.
 * Runs after class/style stripping, so "bare" means truly attribute-free.
 */
function unwrapRedundantFormatting(root: Element): void {
  root.querySelectorAll("span").forEach((span) => {
    if (span.attributes.length === 0) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  });
  root
    .querySelectorAll("b, strong, i, em, u, ins, s, strike, del")
    .forEach((el) => {
      const parent = el.parentElement;
      if (!parent || el.attributes.length > 0) return;
      const group = FORMAT_GROUP[el.tagName];
      if (group && group === FORMAT_GROUP[parent.tagName]) {
        el.replaceWith(...Array.from(el.childNodes));
      }
    });
}

function inlineString(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (VOID_TAGS.has(el.tagName)) return `<${tag}${attrString(el)}>`;
  const inner = Array.from(el.childNodes).map(inlineString).join("");
  return `<${tag}${attrString(el)}>${inner}</${tag}>`;
}

function blockString(node: ChildNode, depth: number): string {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text.trim() ? `${pad}${text.trim()}` : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (VOID_TAGS.has(el.tagName)) return `${pad}<${tag}${attrString(el)}>`;

  const children = Array.from(el.childNodes);
  const hasBlockChild = children.some(
    (c) =>
      c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as Element).tagName),
  );

  if (!hasBlockChild) {
    const inner = children.map(inlineString).join("");
    return `${pad}<${tag}${attrString(el)}>${inner}</${tag}>`;
  }

  const inner = children
    .map((c) => blockString(c, depth + 1))
    .filter(Boolean)
    .join("\n");
  return `${pad}<${tag}${attrString(el)}>\n${inner}\n${pad}</${tag}>`;
}

/**
 * Clean Lexical's raw HTML export into Bootstrap Email source (class-based,
 * span-free). Browser-only (uses the DOM).
 */
export function cleanBootstrapHtml(rawHtml: string, pretty = true): string {
  const container = document.createElement("div");
  container.innerHTML = rawHtml;
  convertInlineStyles(container);
  stripEditorClasses(container);
  unwrapRedundantFormatting(container);
  if (!pretty) return container.innerHTML;
  return Array.from(container.childNodes)
    .map((node) => blockString(node, 0))
    .filter(Boolean)
    .join("\n");
}

function wrapDocument(content: string, pretty: boolean): string {
  const body = pretty
    ? content
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n")
    : content;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div class="container">
${body}
    </div>
  </body>
</html>`;
}

/**
 * Export the editor's content as Bootstrap Email source HTML — a content
 * fragment by default, or a full email document with `{ document: true }`.
 * Browser-only (uses the DOM). Feed the result to the bootstrap-email compiler.
 */
export function toBootstrapEmailHtml(
  editor: LexicalEditor,
  options: BootstrapEmailHtmlOptions = {},
): string {
  const { document: asDocument = false, pretty = true } = options;
  let raw = "";
  editor.getEditorState().read(() => {
    raw = $generateHtmlFromNodes(editor, null);
  });
  const fragment = cleanBootstrapHtml(raw, pretty);
  return asDocument ? wrapDocument(fragment, pretty) : fragment;
}
