import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";

import { BootstrapParagraphNode } from "../nodes/BootstrapParagraphNode";
import { ColumnNode } from "../nodes/ColumnNode";
import { RowNode } from "../nodes/RowNode";
import "../nodes/grid.css";

/**
 * Keeps the grid structure well-formed as the document is edited:
 *
 * - an empty column always gets a paragraph back, so the cursor can enter it;
 * - a row with no columns left removes itself.
 *
 * Registered as node transforms so the invariants hold no matter how the edit
 * happened (typing, deletion, paste, undo).
 */
export function GridPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([RowNode, ColumnNode])) {
      throw new Error("GridPlugin: RowNode and ColumnNode must be registered");
    }
    return mergeRegister(
      editor.registerNodeTransform(ColumnNode, (column) => {
        if (column.getChildrenSize() === 0) {
          column.append(new BootstrapParagraphNode());
        }
      }),
      editor.registerNodeTransform(RowNode, (row) => {
        if (row.getColumns().length === 0) {
          row.remove();
        }
      }),
    );
  }, [editor]);

  return null;
}
