import { $applyNodeReplacement, ElementNode } from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  SerializedElementNode,
} from "lexical";

import { $isColumnNode, type ColumnNode } from "./ColumnNode";

export type SerializedRowNode = SerializedElementNode;

/**
 * A Bootstrap Email grid row, exported as `<div class="row">`. It contains only
 * {@link ColumnNode} children, whose spans always total 12. Structural upkeep
 * (empty columns, stray children, empty rows) is handled by the GridPlugin.
 */
export class RowNode extends ElementNode {
  static getType(): string {
    return "bootstrap-row";
  }

  static clone(node: RowNode): RowNode {
    return new RowNode(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "bew-row";
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("row")) return null;
        return { conversion: $convertRowElement, priority: 1 };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "row";
    return { element };
  }

  static importJSON(serializedNode: SerializedRowNode): RowNode {
    const node = $createRowNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedRowNode {
    return {
      ...super.exportJSON(),
      type: "bootstrap-row",
      version: 1,
    };
  }

  /** The row's columns, in order. */
  getColumns(): ColumnNode[] {
    return this.getChildren().filter($isColumnNode);
  }

  // A row is a structural container: no direct text, and it's removed when it
  // has no columns left.
  canBeEmpty(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

function $convertRowElement(): DOMConversionOutput {
  return { node: $createRowNode() };
}

export function $createRowNode(): RowNode {
  return $applyNodeReplacement(new RowNode());
}

export function $isRowNode(
  node: LexicalNode | null | undefined,
): node is RowNode {
  return node instanceof RowNode;
}
