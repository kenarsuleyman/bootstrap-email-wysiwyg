import { TOGGLE_LINK_COMMAND, $createLinkNode } from "@lexical/link";
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
} from "lexical";
import type { LexicalEditor } from "lexical";

/** URL schemes allowed on links. Anything else (e.g. `javascript:`) is rejected. */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "sms:", "tel:"]);

/**
 * Normalize a user-entered link URL: trim it, and prefix a bare domain
 * (e.g. `example.com`) with `https://` so it resolves as an absolute link.
 * Explicit schemes, root-relative (`/…`) and anchor (`#…`) links pass through.
 */
export function normalizeLinkUrl(input: string): string {
  const url = input.trim();
  if (!url) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/") || url.startsWith("#")) {
    return url;
  }
  return `https://${url}`;
}

/**
 * True when `url` is safe to embed in an email link. Passed to Lexical's
 * `LinkPlugin` as `validateUrl` and used to gate {@link toggleLink}, so
 * `javascript:` / `data:` and other script-y URLs never enter the document.
 */
export function isSafeLinkUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  // Root-relative and in-page anchor links carry no scheme and are safe.
  if (value.startsWith("/") || value.startsWith("#")) return true;
  try {
    return SAFE_PROTOCOLS.has(new URL(normalizeLinkUrl(value)).protocol);
  } catch {
    return false;
  }
}

/**
 * Wrap the current selection in a link, update the link under the cursor, or
 * remove it when `url` is `null`. Unsafe or empty URLs are ignored. No-op when
 * the editor has no range selection.
 */
export function toggleLink(editor: LexicalEditor, url: string | null): void {
  if (url === null) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    return;
  }
  const normalized = normalizeLinkUrl(url);
  if (!isSafeLinkUrl(normalized)) return;
  // Pass rel: null so $toggleLink doesn't default to rel="noreferrer" — keeps
  // the exported anchor bare and consistent with insertLinkWithText.
  editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: normalized, rel: null });
}

/**
 * Insert a brand-new link at a collapsed cursor (where there's no text to
 * wrap). `text` becomes the visible link text; when empty, the URL itself is
 * used. Unsafe or empty URLs are ignored.
 */
export function insertLinkWithText(
  editor: LexicalEditor,
  url: string,
  text: string,
): void {
  const normalized = normalizeLinkUrl(url);
  if (!isSafeLinkUrl(normalized)) return;
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const link = $createLinkNode(normalized);
    link.append($createTextNode(text.trim() || normalized));
    $insertNodes([link]);
  });
}
