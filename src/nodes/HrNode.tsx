import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import type { ReactNode } from "react";

import { DEFAULT_HR_MARGIN, hrClasses, parseHrClasses } from "../marginScale";
import { HrComponent } from "./HrComponent";

export interface HrPayload {
  top?: string;
  bottom?: string;
  key?: NodeKey;
}

export type SerializedHrNode = Spread<
  { top: string; bottom: string },
  SerializedLexicalNode
>;

/**
 * A Bootstrap Email horizontal rule (`<hr>`) with configurable top/bottom
 * spacing (`mt-*` / `mb-*`). Rendered as a decorator for the settings overlay.
 */
export class HrNode extends DecoratorNode<ReactNode> {
  __top: string;
  __bottom: string;

  static getType(): string {
    return "bootstrap-hr";
  }

  static clone(node: HrNode): HrNode {
    return new HrNode(node.__top, node.__bottom, node.__key);
  }

  constructor(
    top: string = DEFAULT_HR_MARGIN,
    bottom: string = DEFAULT_HR_MARGIN,
    key?: NodeKey,
  ) {
    super(key);
    this.__top = top;
    this.__bottom = bottom;
  }

  static importJSON(serializedNode: SerializedHrNode): HrNode {
    return $createHrNode({
      top: serializedNode.top,
      bottom: serializedNode.bottom,
    });
  }

  exportJSON(): SerializedHrNode {
    return {
      type: "bootstrap-hr",
      version: 1,
      top: this.__top,
      bottom: this.__bottom,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return { hr: () => ({ conversion: $convertHrElement, priority: 0 }) };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("hr");
    element.className = hrClasses(this.__top, this.__bottom).join(" ");
    return { element };
  }

  getTop(): string {
    return this.getLatest().__top;
  }

  setTop(top: string): this {
    const writable = this.getWritable();
    writable.__top = top;
    return writable;
  }

  getBottom(): string {
    return this.getLatest().__bottom;
  }

  setBottom(bottom: string): this {
    const writable = this.getWritable();
    writable.__bottom = bottom;
    return writable;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "bew-hr-block";
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): ReactNode {
    return (
      <HrComponent
        nodeKey={this.getKey()}
        top={this.__top}
        bottom={this.__bottom}
      />
    );
  }
}

function $convertHrElement(domNode: HTMLElement): DOMConversionOutput {
  const { top, bottom } = parseHrClasses(Array.from(domNode.classList));
  return { node: $createHrNode({ top, bottom }) };
}

export function $createHrNode(payload: HrPayload = {}): HrNode {
  const { top = DEFAULT_HR_MARGIN, bottom = DEFAULT_HR_MARGIN, key } = payload;
  return $applyNodeReplacement(new HrNode(top, bottom, key));
}

export function $isHrNode(
  node: LexicalNode | null | undefined,
): node is HrNode {
  return node instanceof HrNode;
}
