import { $insertNodeToNearestRoot } from "@lexical/utils";
import type { LexicalEditor } from "lexical";

import { $createHrNode, type HrPayload } from "./HrNode";

/** Insert a horizontal rule (separator) as a block at the current selection. */
export function insertHr(editor: LexicalEditor, payload: HrPayload = {}): void {
  editor.update(() => {
    $insertNodeToNearestRoot($createHrNode(payload));
  });
}
