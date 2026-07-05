import { $getSelection, $isRangeSelection } from "lexical";
import type { LexicalEditor, LexicalNode } from "lexical";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection";

import { $isButtonNode, ButtonNode } from "./ButtonNode";
import { captureButtonStyle, rememberButtonStyle } from "./buttonMemory";
import {
  BASE_FONT_SIZE,
  fontSizePx,
  pxToFontSizeKey,
  stepFontSize,
  type FontSizeKey,
} from "../fontSize";

export type FontSizeDirection = "increase" | "decrease";

/** Nodes that carry a block/element-level font size (blocks and buttons). */
interface FontSizableNode extends LexicalNode {
  getFontSize(): string | null;
  setFontSize(key: string | null): unknown;
}

function isFontSizable(node: LexicalNode | null): node is FontSizableNode {
  return (
    node !== null &&
    typeof (node as FontSizableNode).setFontSize === "function"
  );
}

/** Store the key, or null when it lands on the default ("base"). */
function toStored(key: FontSizeKey): string | null {
  return key === BASE_FONT_SIZE ? null : key;
}

/**
 * Step the font size up or down one notch. Replaces any existing size (never
 * stacks) and treats "no size" as base. Targets, in order:
 *  - cursor inside a button   → the button (inline font-size),
 *  - collapsed selection      → the enclosing block (text-* class),
 *  - non-empty text selection → the selected text (span, text-* class).
 * Must run inside an `editor.update()`.
 */
export function $adjustFontSize(direction: FontSizeDirection): void {
  const step = direction === "increase" ? 1 : -1;
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const anchorNode = selection.anchor.getNode();

  // 1. Button ancestor.
  let cursor: LexicalNode | null = anchorNode;
  while (cursor !== null) {
    if ($isButtonNode(cursor)) {
      const next = stepFontSize(cursor.getFontSize(), step);
      const button = (cursor as ButtonNode).setFontSize(toStored(next));
      rememberButtonStyle(captureButtonStyle(button));
      return;
    }
    cursor = cursor.getParent();
  }

  // 2. Collapsed selection → block.
  if (selection.isCollapsed()) {
    const block =
      anchorNode.getKey() === "root"
        ? null
        : anchorNode.getTopLevelElementOrThrow();
    if (isFontSizable(block)) {
      const next = stepFontSize(block.getFontSize(), step);
      block.setFontSize(toStored(next));
    }
    return;
  }

  // 3. Text selection → styled span (inline font-size, later class-ified).
  const current = $getSelectionStyleValueForProperty(
    selection,
    "font-size",
    "",
  );
  const px = parseInt(current, 10);
  const currentKey = Number.isNaN(px) ? null : pxToFontSizeKey(px);
  const next = stepFontSize(currentKey, step);
  $patchStyleText(selection, {
    "font-size": next === BASE_FONT_SIZE ? null : `${fontSizePx(next)}px`,
  });
}

/** Convenience wrapper that runs {@link $adjustFontSize} in an editor update. */
export function adjustFontSize(
  editor: LexicalEditor,
  direction: FontSizeDirection,
): void {
  editor.update(() => $adjustFontSize(direction));
}
