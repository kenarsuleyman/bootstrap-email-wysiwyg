import { $getSelection, $insertNodes, $isRangeSelection } from "lexical";
import type { LexicalEditor } from "lexical";

import { $createButtonWithLabel } from "./ButtonNode";
import type { ButtonPayload } from "./ButtonNode";

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
