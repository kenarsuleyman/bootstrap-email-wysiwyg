import { $getSelection, $isRangeSelection } from "lexical";
import type { LexicalEditor, LexicalNode } from "lexical";
import { $patchStyleText } from "@lexical/selection";

import { $isButtonNode, ButtonNode } from "./ButtonNode";
import { captureButtonStyle, rememberButtonStyle } from "./buttonMemory";
import { tokenToHex, type ColorKind } from "../colors";

export type { ColorKind };

/** Nodes that carry a block/element-level text or background color. */
interface ColorableNode extends LexicalNode {
  setTextColor(token: string | null): unknown;
  setBgColor(token: string | null): unknown;
}

function isColorable(node: LexicalNode | null): node is ColorableNode {
  return (
    node !== null &&
    typeof (node as ColorableNode).setTextColor === "function"
  );
}

function applyToNode(
  node: ColorableNode,
  kind: ColorKind,
  token: string | null,
): void {
  if (kind === "text") node.setTextColor(token);
  else if (kind === "bg") node.setBgColor(token);
  // Blocks have no border; border color is a no-op unless overridden below.
}

/** Set a color on a button and remember its full styling for the next insert. */
function applyToButton(
  node: ButtonNode,
  kind: ColorKind,
  token: string | null,
): void {
  const button =
    kind === "text"
      ? node.setTextColor(token)
      : kind === "bg"
        ? node.setBgColor(token)
        : node.setBorderColor(token);
  rememberButtonStyle(captureButtonStyle(button));
}

/**
 * Apply a color following the target rules. Must be called inside an
 * `editor.update()` (hence the `$` prefix):
 *  - cursor inside a button   → the button node,
 *  - collapsed selection      → the enclosing block (parent element),
 *  - non-empty text selection → the selected text (inline span).
 */
export function $applyColor(kind: ColorKind, token: string | null): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const anchorNode = selection.anchor.getNode();

  // 1. Button ancestor wins regardless of selection state. Buttons support all
  //    three color kinds (text / background / border).
  let cursor: LexicalNode | null = anchorNode;
  while (cursor !== null) {
    if ($isButtonNode(cursor)) {
      applyToButton(cursor, kind, token);
      return;
    }
    cursor = cursor.getParent();
  }

  // Border color only applies to buttons; nothing else has a border yet.
  if (kind === "border") return;

  // 2. Collapsed selection colors the whole enclosing block.
  if (selection.isCollapsed()) {
    const block =
      anchorNode.getKey() === "root"
        ? null
        : anchorNode.getTopLevelElementOrThrow();
    if (isColorable(block)) applyToNode(block, kind, token);
    return;
  }

  // 3. Selected text becomes a styled span.
  const property = kind === "text" ? "color" : "background-color";
  $patchStyleText(selection, {
    [property]: token ? tokenToHex(token) : null,
  });
}

/** Convenience wrapper that runs {@link $applyColor} in an editor update. */
export function applyColor(
  editor: LexicalEditor,
  kind: ColorKind,
  token: string | null,
): void {
  editor.update(() => $applyColor(kind, token));
}
