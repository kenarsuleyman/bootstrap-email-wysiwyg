import { $insertNodeToNearestRoot } from "@lexical/utils";
import type { LexicalEditor } from "lexical";

import { $createImageNode, type ImagePayload } from "./ImageNode";

/** Insert an image (from a URL) as a block at the current selection. */
export function insertImage(editor: LexicalEditor, payload: ImagePayload): void {
  editor.update(() => {
    $insertNodeToNearestRoot($createImageNode(payload));
  });
}
