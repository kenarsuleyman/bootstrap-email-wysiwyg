import {
  $applyNodeReplacement,
  $createTextNode,
  ElementNode,
} from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  SerializedElementNode,
  Spread,
} from "lexical";

import { parseBootstrapAttributes } from "./parseClasses";
import { colorAttributes, tokenToHex } from "../colors";
import { fontSizePx, type FontSizeKey } from "../fontSize";

/** Bootstrap contextual color variants supported by Bootstrap Email buttons. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "light"
  | "dark";

const BUTTON_VARIANTS: ReadonlySet<string> = new Set<ButtonVariant>([
  "primary",
  "secondary",
  "success",
  "danger",
  "warning",
  "info",
  "light",
  "dark",
]);

export interface ButtonPayload {
  href?: string;
  variant?: ButtonVariant;
  outline?: boolean;
  textColor?: string | null;
  bgColor?: string | null;
  borderColor?: string | null;
  fontSize?: string | null;
}

export type SerializedButtonNode = Spread<
  {
    href: string;
    variant: ButtonVariant;
    outline: boolean;
    textColor: string | null;
    bgColor: string | null;
    borderColor: string | null;
    fontSize: string | null;
  },
  SerializedElementNode
>;

/**
 * A Bootstrap Email button, authored in source as
 * `<a href="…" class="btn btn-primary">Label</a>`. Modeled as an inline
 * element so the label text is edited natively, while href / color variant /
 * outline are node properties.
 */
export class ButtonNode extends ElementNode {
  __href: string;
  __variant: ButtonVariant;
  __outline: boolean;
  __textColor: string | null;
  __bgColor: string | null;
  __borderColor: string | null;
  __fontSize: string | null;

  static getType(): string {
    return "bootstrap-button";
  }

  static clone(node: ButtonNode): ButtonNode {
    return new ButtonNode(
      node.__href,
      node.__variant,
      node.__outline,
      node.__textColor,
      node.__bgColor,
      node.__borderColor,
      node.__fontSize,
      node.__key,
    );
  }

  constructor(
    href = "#",
    variant: ButtonVariant = "primary",
    outline = false,
    textColor: string | null = null,
    bgColor: string | null = null,
    borderColor: string | null = null,
    fontSize: string | null = null,
    key?: string,
  ) {
    super(key);
    this.__href = href;
    this.__variant = variant;
    this.__outline = outline;
    this.__textColor = textColor;
    this.__bgColor = bgColor;
    this.__borderColor = borderColor;
    this.__fontSize = fontSize;
  }

  // --- Rendering -----------------------------------------------------------

  private variantClass(): string {
    return this.__outline
      ? `btn-outline-${this.__variant}`
      : `btn-${this.__variant}`;
  }

  private buildClassName(): string {
    return `btn ${this.variantClass()}`;
  }

  private applyInlineStyles(dom: HTMLElement): void {
    dom.style.color = this.__textColor ? tokenToHex(this.__textColor) : "";
    dom.style.backgroundColor = this.__bgColor
      ? tokenToHex(this.__bgColor)
      : "";
    dom.style.borderColor = this.__borderColor
      ? tokenToHex(this.__borderColor)
      : "";
    dom.style.fontSize = this.__fontSize
      ? `${fontSizePx(this.__fontSize as FontSizeKey)}px`
      : "";
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("a");
    element.href = this.__href;
    element.className = this.buildClassName();
    this.applyInlineStyles(element);
    return element;
  }

  updateDOM(prevNode: ButtonNode, dom: HTMLElement): boolean {
    const anchor = dom as HTMLAnchorElement;
    if (prevNode.__href !== this.__href) {
      anchor.href = this.__href;
    }
    if (
      prevNode.__variant !== this.__variant ||
      prevNode.__outline !== this.__outline
    ) {
      anchor.className = this.buildClassName();
    }
    if (
      prevNode.__textColor !== this.__textColor ||
      prevNode.__bgColor !== this.__bgColor ||
      prevNode.__borderColor !== this.__borderColor ||
      prevNode.__fontSize !== this.__fontSize
    ) {
      this.applyInlineStyles(anchor);
    }
    return false;
  }

  // --- HTML import / export ------------------------------------------------

  static importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("btn")) {
          return null;
        }
        // Above LinkNode's own `a` converter (priority 1), which would
        // otherwise win the tie and import the button as a plain link.
        return { conversion: $convertButtonElement, priority: 2 };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("a");
    element.setAttribute("href", this.__href);

    const { classes, style } = colorAttributes(
      this.__textColor,
      this.__bgColor,
      this.__borderColor,
    );
    element.className = [this.buildClassName(), ...classes].join(" ");

    // Font size must be inline: the size class would be overridden by
    // `.btn td a { font-size }` after Bootstrap Email compiles the button.
    const styleParts = style ? [style] : [];
    if (this.__fontSize) {
      styleParts.push(`font-size: ${fontSizePx(this.__fontSize as FontSizeKey)}px`);
    }
    if (styleParts.length) element.setAttribute("style", styleParts.join("; "));
    return { element };
  }

  // --- JSON serialization --------------------------------------------------

  static importJSON(serializedNode: SerializedButtonNode): ButtonNode {
    const node = $createButtonNode({
      href: serializedNode.href,
      variant: serializedNode.variant,
      outline: serializedNode.outline,
      textColor: serializedNode.textColor ?? null,
      bgColor: serializedNode.bgColor ?? null,
      borderColor: serializedNode.borderColor ?? null,
      fontSize: serializedNode.fontSize ?? null,
    });
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedButtonNode {
    return {
      ...super.exportJSON(),
      type: "bootstrap-button",
      version: 1,
      href: this.getHref(),
      variant: this.getVariant(),
      outline: this.getOutline(),
      textColor: this.__textColor,
      bgColor: this.__bgColor,
      borderColor: this.__borderColor,
      fontSize: this.__fontSize,
    };
  }

  // --- Accessors -----------------------------------------------------------

  getHref(): string {
    return this.getLatest().__href;
  }

  setHref(href: string): this {
    const writable = this.getWritable();
    writable.__href = href;
    return writable;
  }

  getVariant(): ButtonVariant {
    return this.getLatest().__variant;
  }

  setVariant(variant: ButtonVariant): this {
    const writable = this.getWritable();
    writable.__variant = variant;
    return writable;
  }

  getOutline(): boolean {
    return this.getLatest().__outline;
  }

  setOutline(outline: boolean): this {
    const writable = this.getWritable();
    writable.__outline = outline;
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

  getFontSize(): string | null {
    return this.getLatest().__fontSize;
  }

  setFontSize(key: string | null): this {
    const writable = this.getWritable();
    writable.__fontSize = key;
    return writable;
  }

  // --- Behavior ------------------------------------------------------------

  isInline(): boolean {
    return true;
  }

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

function $convertButtonElement(domNode: HTMLElement): DOMConversionOutput {
  const anchor = domNode as HTMLAnchorElement;
  const outline = Array.from(anchor.classList).some((cls) =>
    cls.startsWith("btn-outline-"),
  );

  let variant: ButtonVariant = "primary";
  for (const cls of Array.from(anchor.classList)) {
    const name = cls
      .replace(/^btn-outline-/, "")
      .replace(/^btn-/, "");
    if (name !== cls && BUTTON_VARIANTS.has(name)) {
      variant = name as ButtonVariant;
      break;
    }
  }

  // Color overrides ride on `text-*`/`bg-*`/`border-*` classes (palette) or the
  // inline style (custom hex); font size is always inline on a button anchor.
  const { textColor, bgColor, borderColor, fontSize } =
    parseBootstrapAttributes(anchor);

  const node = $createButtonNode({
    href: anchor.getAttribute("href") ?? "#",
    variant,
    outline,
    textColor,
    bgColor,
    borderColor,
    fontSize,
  });
  return { node };
}

export function $createButtonNode(payload: ButtonPayload = {}): ButtonNode {
  const {
    href = "#",
    variant = "primary",
    outline = false,
    textColor = null,
    bgColor = null,
    borderColor = null,
    fontSize = null,
  } = payload;
  return $applyNodeReplacement(
    new ButtonNode(
      href,
      variant,
      outline,
      textColor,
      bgColor,
      borderColor,
      fontSize,
    ),
  );
}

/** Create a button already populated with a text label. */
export function $createButtonWithLabel(
  label: string,
  payload: ButtonPayload = {},
): ButtonNode {
  const node = $createButtonNode(payload);
  node.append($createTextNode(label));
  return node;
}

export function $isButtonNode(
  node: LexicalNode | null | undefined,
): node is ButtonNode {
  return node instanceof ButtonNode;
}
