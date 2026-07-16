import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
} from "lexical";
import type {
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  TextNode,
} from "lexical";
import { $findMatchingParent } from "@lexical/utils";

import { $isButtonNode, type ButtonNode } from "./ButtonNode";
import { $createMergeTagNode, type MergeTagNode } from "./MergeTagNode";

/** The button enclosing a node, or null. A button is an inline element whose
 *  children are its label text — a merge tag can serve as (part of) that label. */
function $buttonOf(node: LexicalNode): ButtonNode | null {
  if ($isButtonNode(node)) return node;
  const match = $findMatchingParent(node, $isButtonNode);
  return $isButtonNode(match) ? match : null;
}

/** Insert a tag between the parts of a text node split at `offset`. */
function $insertTagAtTextPoint(
  node: TextNode,
  offset: number,
  tag: MergeTagNode,
): void {
  if (offset <= 0) {
    node.insertBefore(tag);
  } else if (offset >= node.getTextContentSize()) {
    node.insertAfter(tag);
  } else {
    const [before] = node.splitText(offset);
    before.insertAfter(tag);
  }
}

/**
 * Insert a merge tag *inside* a button, so it becomes (part of) the label. The
 * generic `$insertNodes` can't do this — it splices inline nodes into the
 * nearest block, which for an inline button is the surrounding paragraph, so the
 * tag escapes the button and an emptied button is dropped. Instead we edit the
 * button's own children.
 */
function $insertTagIntoButton(
  button: ButtonNode,
  selection: RangeSelection,
  tag: MergeTagNode,
): void {
  // Whole label selected → replace it, but keep the button. Append first so the
  // button is never momentarily empty (which would auto-remove it).
  const wholeLabelSelected =
    !selection.isCollapsed() &&
    selection.getTextContent() === button.getTextContent();
  if (wholeLabelSelected) {
    const oldChildren = button.getChildren();
    button.append(tag);
    oldChildren.forEach((child) => child.remove());
    tag.selectNext();
    return;
  }

  // Partial selection → delete it first; this keeps the button (some label
  // remains) and collapses the caret inside it. Then drop the tag at the caret.
  if (!selection.isCollapsed()) {
    selection.removeText();
  }
  const point = selection.anchor;
  const node = point.getNode();
  if ($isTextNode(node)) {
    $insertTagAtTextPoint(node, point.offset, tag);
  } else if ($isButtonNode(node)) {
    // Caret on the (empty) button element; offset is a child index.
    const child = node.getChildAtIndex(point.offset);
    if (child) child.insertBefore(tag);
    else node.append(tag);
  } else {
    button.append(tag);
  }
  tag.selectNext();
}

/**
 * Insert a `{{mergeKey}}` merge tag at the current selection as an atomic token.
 * When the selection sits inside a button, the tag is inserted as part of the
 * button's label (replacing any selected label text); otherwise it's inserted
 * at the selection like normal text. No-op without a range selection.
 */
export function insertMergeTag(editor: LexicalEditor, mergeKey: string): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const tag = $createMergeTagNode(mergeKey);

    // Handle the button case only when the whole selection is within one
    // button; a selection straddling the button boundary falls through.
    const anchorButton = $buttonOf(selection.anchor.getNode());
    const focusButton = $buttonOf(selection.focus.getNode());
    if ($isButtonNode(anchorButton) && anchorButton.is(focusButton)) {
      $insertTagIntoButton(anchorButton, selection, tag);
      return;
    }

    $insertNodes([tag]);
  });
}
