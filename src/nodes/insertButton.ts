import { $getSelection, $insertNodes, $isRangeSelection } from "lexical";
import type { LexicalEditor } from "lexical";
import { $findMatchingParent } from "@lexical/utils";

import { $createButtonWithLabel, $isButtonNode } from "./ButtonNode";
import type { ButtonPayload } from "./ButtonNode";
import { isSafeLinkUrl, normalizeLinkUrl } from "./insertLink";

export interface InsertButtonOptions extends ButtonPayload {
  /** Text label for the button. Defaults to "Button". */
  label?: string;
}

/**
 * Insert a Bootstrap Email button at the current selection. No-op when there
 * is no range selection (e.g. the editor isn't focused).
 */
export function insertButton(
  editor: LexicalEditor,
  options: InsertButtonOptions = {},
): void {
  const { label = "Button", ...payload } = options;
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    $insertNodes([$createButtonWithLabel(label, payload)]);
  });
}

/**
 * Set the link destination of the button enclosing the current selection.
 * A button is itself an `<a>`, so its own `href` is the link — this avoids
 * nesting a separate anchor inside it. An empty URL resets the href to `"#"`;
 * unsafe URLs are ignored. No-op when the selection isn't inside a button.
 */
export function setButtonHref(editor: LexicalEditor, url: string): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const node = selection.anchor.getNode();
    const button = $isButtonNode(node)
      ? node
      : $findMatchingParent(node, $isButtonNode);
    if (!$isButtonNode(button)) return;

    const trimmed = url.trim();
    if (trimmed === "") {
      button.setHref("#");
      return;
    }
    if (!isSafeLinkUrl(trimmed)) return;
    button.setHref(normalizeLinkUrl(trimmed));
  });
}
