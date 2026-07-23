import { $applyNodeReplacement, ElementNode } from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  SerializedElementNode,
  Spread,
} from "lexical";

import { colorAttributes, tokenToHex } from "../colors";
import { parseBootstrapAttributes } from "./parseClasses";
import { GRID_UNITS } from "./gridLayout";

export type SerializedColumnNode = Spread<
  {
    span: number;
    textColor: string | null;
    bgColor: string | null;
    borderColor: string | null;
  },
  SerializedElementNode
>;

/** Clamp a raw span into the `1..12` grid range. */
function clampSpan(span: number): number {
  if (!Number.isFinite(span)) return GRID_UNITS;
  return Math.max(1, Math.min(Math.round(span), GRID_UNITS));
}

/** Parse the width unit out of a Bootstrap `col` / `col-N` class list. */
function spanFromClasses(classes: string[]): number {
  for (const cls of classes) {
    const match = cls.match(/^col-(\d{1,2})$/);
    if (match) return clampSpan(parseInt(match[1], 10));
  }
  // A bare `col` means auto/equal width — treat as full and let the row's
  // re-balancing settle the real value.
  return GRID_UNITS;
}

/**
 * One column of a Bootstrap Email grid, exported as `<div class="col-N">` where
 * `N` is the width in 12ths. A column holds normal block content (paragraphs,
 * images, …) and acts as a shadow root so editing stays contained to it. Its
 * own text/background/border colors (applied when the column is selected)
 * become classes/inline styles on the `col-N` div itself.
 */
export class ColumnNode extends ElementNode {
  __span: number;
  __textColor: string | null;
  __bgColor: string | null;
  __borderColor: string | null;

  static getType(): string {
    return "bootstrap-column";
  }

  static clone(node: ColumnNode): ColumnNode {
    return new ColumnNode(
      node.__span,
      node.__textColor,
      node.__bgColor,
      node.__borderColor,
      node.__key,
    );
  }

  constructor(
    span: number = GRID_UNITS,
    textColor: string | null = null,
    bgColor: string | null = null,
    borderColor: string | null = null,
    key?: string,
  ) {
    super(key);
    this.__span = clampSpan(span);
    this.__textColor = textColor;
    this.__bgColor = bgColor;
    this.__borderColor = borderColor;
  }

  // --- Rendering -----------------------------------------------------------

  private applyStyles(dom: HTMLElement): void {
    const width = `${(this.__span / GRID_UNITS) * 100}%`;
    dom.style.flex = `0 0 ${width}`;
    dom.style.maxWidth = width;
    dom.style.backgroundColor = this.__bgColor ? tokenToHex(this.__bgColor) : "";
    dom.style.color = this.__textColor ? tokenToHex(this.__textColor) : "";
    dom.style.borderColor = this.__borderColor
      ? tokenToHex(this.__borderColor)
      : "";
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "bew-col";
    this.applyStyles(dom);
    return dom;
  }

  updateDOM(prevNode: ColumnNode, dom: HTMLElement): boolean {
    if (
      prevNode.__span !== this.__span ||
      prevNode.__textColor !== this.__textColor ||
      prevNode.__bgColor !== this.__bgColor ||
      prevNode.__borderColor !== this.__borderColor
    ) {
      this.applyStyles(dom);
    }
    return false;
  }

  // --- HTML import / export ------------------------------------------------

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        const isColumn = Array.from(domNode.classList).some(
          (cls) => cls === "col" || /^col-\d{1,2}$/.test(cls),
        );
        if (!isColumn) return null;
        return { conversion: $convertColumnElement, priority: 1 };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    const { classes, style } = colorAttributes(
      this.__textColor,
      this.__bgColor,
      this.__borderColor,
    );
    element.className = [`col-${this.__span}`, ...classes].join(" ");
    if (style) element.setAttribute("style", style);
    return { element };
  }

  // --- JSON serialization --------------------------------------------------

  static importJSON(serializedNode: SerializedColumnNode): ColumnNode {
    const node = $createColumnNode(serializedNode.span);
    node.setTextColor(serializedNode.textColor ?? null);
    node.setBgColor(serializedNode.bgColor ?? null);
    node.setBorderColor(serializedNode.borderColor ?? null);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedColumnNode {
    return {
      ...super.exportJSON(),
      type: "bootstrap-column",
      version: 1,
      span: this.__span,
      textColor: this.__textColor,
      bgColor: this.__bgColor,
      borderColor: this.__borderColor,
    };
  }

  // --- Accessors -----------------------------------------------------------

  getSpan(): number {
    return this.getLatest().__span;
  }

  setSpan(span: number): this {
    const writable = this.getWritable();
    writable.__span = clampSpan(span);
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

  getBorderColor(): string | null {
    return this.getLatest().__borderColor;
  }

  setBorderColor(token: string | null): this {
    const writable = this.getWritable();
    writable.__borderColor = token;
    return writable;
  }

  // --- Behavior ------------------------------------------------------------

  isShadowRoot(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return true;
  }
}

function $convertColumnElement(domNode: HTMLElement): DOMConversionOutput {
  const node = $createColumnNode(spanFromClasses(Array.from(domNode.classList)));
  const { textColor, bgColor, borderColor } = parseBootstrapAttributes(domNode);
  node.setTextColor(textColor);
  node.setBgColor(bgColor);
  node.setBorderColor(borderColor);
  return { node };
}

export function $createColumnNode(span: number = GRID_UNITS): ColumnNode {
  return $applyNodeReplacement(new ColumnNode(span));
}

export function $isColumnNode(
  node: LexicalNode | null | undefined,
): node is ColumnNode {
  return node instanceof ColumnNode;
}
