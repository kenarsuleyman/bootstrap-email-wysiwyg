import { ParagraphNode } from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  SerializedParagraphNode,
  Spread,
} from "lexical";

import { $isButtonNode } from "./ButtonNode";
import { axAlignClass, textAlignClass } from "./alignment";
import { $convertStyledSpanElement } from "./inlineStyle";
import { parseBootstrapAttributes } from "./parseClasses";
import { colorAttributes, tokenToHex } from "../colors";
import { fontSizeClass, fontSizePx, type FontSizeKey } from "../fontSize";

export type SerializedBootstrapParagraphNode = Spread<
  {
    textColor: string | null;
    bgColor: string | null;
    fontSize: string | null;
  },
  SerializedParagraphNode
>;

/**
 * A paragraph that exports as a Bootstrap Email `<div>` line rather than a
 * `<p>`. Alignment becomes a `text-*` class (or `ax-*` when the block's content
 * is a button), and block-level text/background colors become `text-*` / `bg-*`
 * classes (or inline styles for custom colors).
 */
export class BootstrapParagraphNode extends ParagraphNode {
  __textColor: string | null;
  __bgColor: string | null;
  __fontSize: string | null;

  constructor(
    textColor: string | null = null,
    bgColor: string | null = null,
    fontSize: string | null = null,
    key?: string,
  ) {
    super(key);
    this.__textColor = textColor;
    this.__bgColor = bgColor;
    this.__fontSize = fontSize;
  }

  static getType(): string {
    return "bootstrap-paragraph";
  }

  static clone(node: BootstrapParagraphNode): BootstrapParagraphNode {
    return new BootstrapParagraphNode(
      node.__textColor,
      node.__bgColor,
      node.__fontSize,
      node.__key,
    );
  }

  /**
   * Import the `<div>` line this node exports (and `<p>`, for hand-written
   * HTML), restoring alignment / colors / font size from the classes. Rows and
   * columns claim their own `<div>`s at a higher priority.
   */
  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({ conversion: $convertParagraphElement, priority: 0 }),
      p: () => ({ conversion: $convertParagraphElement, priority: 1 }),
      // Inline color / font-size spans, which Lexical's own <span> converter
      // (priority 0) drops. Merge-tag chips outrank this at priority 2.
      span: () => ({ conversion: $convertStyledSpanElement, priority: 1 }),
    };
  }

  static importJSON(
    serializedNode: SerializedBootstrapParagraphNode,
  ): BootstrapParagraphNode {
    const node = new BootstrapParagraphNode(
      serializedNode.textColor ?? null,
      serializedNode.bgColor ?? null,
      serializedNode.fontSize ?? null,
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedBootstrapParagraphNode {
    return {
      ...super.exportJSON(),
      type: "bootstrap-paragraph",
      version: 1,
      textColor: this.__textColor,
      bgColor: this.__bgColor,
      fontSize: this.__fontSize,
    };
  }

  getFontSize(): string | null {
    return this.getLatest().__fontSize;
  }

  setFontSize(key: string | null): this {
    const writable = this.getWritable();
    writable.__fontSize = key;
    return writable;
  }

  getTextColor(): string | null {
    return this.getLatest().__textColor;
  }

  setTextColor(token: string | null): this {
    const writable = this.getWritable();
    writable.__textColor = token;
    return writable;
  }

  getBgColor(): string | null {
    return this.getLatest().__bgColor;
  }

  setBgColor(token: string | null): this {
    const writable = this.getWritable();
    writable.__bgColor = token;
    return writable;
  }

  private applyInlineStyles(dom: HTMLElement): void {
    dom.style.color = this.__textColor ? tokenToHex(this.__textColor) : "";
    dom.style.backgroundColor = this.__bgColor
      ? tokenToHex(this.__bgColor)
      : "";
    dom.style.fontSize = this.__fontSize
      ? `${fontSizePx(this.__fontSize as FontSizeKey)}px`
      : "";
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    this.applyInlineStyles(dom);
    return dom;
  }

  updateDOM(
    prevNode: BootstrapParagraphNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    if (super.updateDOM(prevNode, dom, config)) return true;
    this.applyInlineStyles(dom);
    return false;
  }

  private hasButtonChild(): boolean {
    return this.getChildren().some((child: LexicalNode) =>
      $isButtonNode(child),
    );
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    const classes: string[] = [];

    const alignCls = this.hasButtonChild()
      ? axAlignClass(this.getFormatType())
      : textAlignClass(this.getFormatType());
    if (alignCls) classes.push(alignCls);

    const { classes: colorClasses, style } = colorAttributes(
      this.__textColor,
      this.__bgColor,
    );
    classes.push(...colorClasses);

    const sizeCls = fontSizeClass(this.__fontSize);
    if (sizeCls) classes.push(sizeCls);

    if (classes.length) element.className = classes.join(" ");
    if (style) element.setAttribute("style", style);

    // Preserve empty lines so they still render height in email clients.
    if (this.getChildrenSize() === 0) {
      element.appendChild(document.createElement("br"));
    }
    return { element };
  }
}

function $convertParagraphElement(domNode: HTMLElement): DOMConversionOutput {
  const { align, textColor, bgColor, fontSize } =
    parseBootstrapAttributes(domNode);
  const node = new BootstrapParagraphNode(textColor, bgColor, fontSize);
  if (align) node.setFormat(align);
  return {
    node,
    // An empty line exports as `<div><br></div>`; keep it empty on the way back
    // instead of importing the spacer as a line break node.
    after: (children) =>
      children.length === 1 && domNode.firstElementChild?.tagName === "BR"
        ? []
        : children,
  };
}
