import { $isTextNode } from "lexical";
import type { DOMConversionOutput } from "lexical";

import { tokenToHex } from "../colors";
import { fontSizePx, type FontSizeKey } from "../fontSize";
import { parseBootstrapAttributes } from "./parseClasses";


// Lexical's built-in <span> converter only recovers bold/italic/underline from
// inline styles — colors and font sizes are dropped. Since we export them as
// `text-*` / `bg-*` classes (or inline styles for custom colors), we re-apply
// them to the text nodes inside the span on the way back in.

/**
 * The inline CSS declarations an element's Bootstrap Email color/size classes
 * (or inline styles) stand for — the form Lexical text nodes store styling in.
 */
export function bootstrapInlineDeclarations(el: HTMLElement): string[] {
  const { textColor, bgColor, fontSize } = parseBootstrapAttributes(el);
  const declarations: string[] = [];
  if (textColor) declarations.push(`color: ${tokenToHex(textColor)}`);
  if (bgColor) declarations.push(`background-color: ${tokenToHex(bgColor)}`);
  if (fontSize) {
    declarations.push(`font-size: ${fontSizePx(fontSize as FontSizeKey)}px`);
  }
  return declarations;
}

/** Merge new declarations into an existing style string; existing keys win. */
export function mergeStyle(existing: string, added: string[]): string {
  const present = new Set(
    existing
      .split(";")
      .map((d) => d.split(":")[0].trim().toLowerCase())
      .filter(Boolean),
  );
  const kept = added.filter((d) => !present.has(d.split(":")[0].trim()));
  return [existing.trim().replace(/;$/, ""), ...kept].filter(Boolean).join("; ");
}

/**
 * Convert an inline `<span>` carrying Bootstrap Email color / size classes into
 * the inline style Lexical stores on text nodes. Returns null when the span
 * carries nothing we model, so other converters can claim it.
 */
export function $convertStyledSpanElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const declarations = bootstrapInlineDeclarations(domNode);
  if (declarations.length === 0) return null;

  return {
    node: null,
    forChild: (lexicalNode) => {
      if (!$isTextNode(lexicalNode)) return lexicalNode;
      lexicalNode.setStyle(mergeStyle(lexicalNode.getStyle(), declarations));
      return lexicalNode;
    },
  };
}
