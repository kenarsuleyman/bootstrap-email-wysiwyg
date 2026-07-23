import { $generateNodesFromDOM } from "@lexical/html";
import { $isLinkNode } from "@lexical/link";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isTextNode,
} from "lexical";
import type {
  ElementNode,
  LexicalEditor,
  LexicalNode,
  TextNode,
  UpdateTag,
} from "lexical";

import { $isImageNode, type ImageNode } from "./nodes/ImageNode";
import {
  $createMergeTagNode,
  $isMergeTagNode,
  MERGE_TAG_PATTERN,
} from "./nodes/MergeTagNode";

// The counterpart of `export.ts`: turns Bootstrap Email source HTML — in
// particular the HTML this editor produced — back into editor content. Lexical
// only accepts serialized state, so raw HTML goes through `$generateNodesFromDOM`
// plus a few repairs the cleaned export makes necessary (merge tags are exported
// as bare `{{key}}` text, linked images as `<a><img></a>`).

export interface BootstrapEmailImportOptions {
  /**
   * Lexical update tag(s) for the import. Pass `"history-merge"` to keep the
   * change out of the undo stack (used when seeding via `initialHtml`).
   */
  tag?: UpdateTag | UpdateTag[];
}

/** Copy the source node's inline format/style onto a replacement node. */
function inherit<T extends TextNode>(node: T, source: TextNode): T {
  node.setFormat(source.getFormat());
  node.setStyle(source.getStyle());
  return node;
}

/**
 * Split a text node's `{{key}}` occurrences into atomic merge-tag nodes,
 * keeping the surrounding text and all inline styling. Returns null when the
 * node holds no merge tag.
 */
function $splitMergeTagText(node: TextNode): TextNode[] | null {
  const text = node.getTextContent();
  const matches = Array.from(text.matchAll(MERGE_TAG_PATTERN));
  if (matches.length === 0) return null;

  const parts: TextNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > cursor) {
      parts.push(inherit($createTextNode(text.slice(cursor, start)), node));
    }
    parts.push(inherit($createMergeTagNode(match[1]), node));
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    parts.push(inherit($createTextNode(text.slice(cursor)), node));
  }
  return parts;
}

/** Replace `{{key}}` text with merge-tag nodes throughout an element subtree. */
function $expandMergeTagsWithin(parent: ElementNode): void {
  for (const child of parent.getChildren()) {
    if ($isElementNode(child)) {
      $expandMergeTagsWithin(child);
      continue;
    }
    if (!$isTextNode(child) || $isMergeTagNode(child)) continue;
    const parts = $splitMergeTagText(child);
    if (!parts) continue;
    let anchor: LexicalNode = child;
    for (const part of parts) {
      anchor.insertAfter(part);
      anchor = part;
    }
    child.remove();
  }
}

/**
 * Restore merge tags across a freshly converted node list. Top-level nodes have
 * no parent yet, so they are rebuilt into a new list rather than spliced.
 */
export function $expandMergeTags(nodes: LexicalNode[]): LexicalNode[] {
  const result: LexicalNode[] = [];
  for (const node of nodes) {
    if ($isElementNode(node)) {
      $expandMergeTagsWithin(node);
      result.push(node);
    } else if ($isTextNode(node) && !$isMergeTagNode(node)) {
      result.push(...($splitMergeTagText(node) ?? [node]));
    } else {
      result.push(node);
    }
  }
  return result;
}

/**
 * A linked image exports as `<a href><img></a>`, which imports as a link
 * wrapping an image that already carries the same href. Drop the redundant
 * link so the image round-trips as a single node.
 */
function $linkedImage(node: LexicalNode): ImageNode | null {
  if (!$isLinkNode(node)) return null;
  const [only, ...rest] = node.getChildren();
  if (rest.length > 0 || !$isImageNode(only)) return null;
  if (!only.getLink()) only.setLink(node.getURL());
  return only;
}

function $unwrapLinkedImages(nodes: LexicalNode[]): LexicalNode[] {
  return nodes.map((node) => {
    const image = $linkedImage(node);
    if (image) {
      // Detach it from the link, which is dropped with the enclosing list.
      image.remove();
      return image;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        const childImage = $linkedImage(child);
        if (childImage) child.replace(childImage);
        else if ($isElementNode(child)) $unwrapLinkedImages([child]);
      }
    }
    return node;
  });
}

function isBlockLevel(node: LexicalNode): boolean {
  if ($isElementNode(node)) return !node.isInline();
  if ($isDecoratorNode(node)) return !node.isInline();
  return false;
}

/**
 * `<div class="container">` wrappers (from `{ document: true }` exports) hold
 * the real content — import their children, not the wrapper itself.
 */
function contentRoot(doc: Document): Element {
  let root: Element = doc.body;
  for (;;) {
    const [only, ...rest] = Array.from(root.children);
    if (
      !only ||
      rest.length > 0 ||
      only.tagName !== "DIV" ||
      !only.classList.contains("container")
    ) {
      return root;
    }
    root = only;
  }
}

/**
 * Convert Bootstrap Email HTML into detached Lexical nodes, with merge tags and
 * linked images restored. Must run inside an `editor.update()` / `read()`.
 */
export function $nodesFromBootstrapEmailHtml(
  editor: LexicalEditor,
  html: string,
): LexicalNode[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return $unwrapLinkedImages(
    $expandMergeTags($generateNodesFromDOM(editor, contentRoot(doc))),
  );
}

/**
 * Replace the editor's content with Bootstrap Email HTML — the inverse of
 * `toBootstrapEmailHtml`. Inline nodes at the top level are wrapped in
 * paragraphs so the document stays well formed.
 */
export function fromBootstrapEmailHtml(
  editor: LexicalEditor,
  html: string,
  options: BootstrapEmailImportOptions = {},
): void {
  editor.update(
    () => {
      const nodes = $nodesFromBootstrapEmailHtml(editor, html);
      const root = $getRoot();
      root.clear();

      let line: ElementNode | null = null;
      for (const node of nodes) {
        if (isBlockLevel(node)) {
          root.append(node);
          line = null;
          continue;
        }
        if (!line) {
          line = $createParagraphNode();
          root.append(line);
        }
        line.append(node);
      }

      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
      root.selectEnd();
    },
    { discrete: true, tag: options.tag },
  );
}
