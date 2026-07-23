import type { ElementFormatType } from "lexical";

import { isColorToken } from "../colors";
import { FONT_SIZE_KEYS, pxToFontSizeKey, type FontSizeKey } from "../fontSize";
import type { Align } from "./alignment";

// The import counterpart of `colorAttributes` / `fontSizeClass` /
// `textAlignClass`: reads Bootstrap Email classes and inline styles back into
// the tokens our nodes store. Used by the DOM converters so exported HTML can
// be loaded into the editor again.

const ALIGNMENTS = new Set<string>(["left", "center", "right", "justify"]);
const SIZE_KEYS = new Set<string>(FONT_SIZE_KEYS);

export interface ParsedBootstrapAttributes {
  /** Alignment from `text-*` / `ax-*`, or null when unaligned. */
  align: ElementFormatType | null;
  textColor: string | null;
  bgColor: string | null;
  borderColor: string | null;
  fontSize: FontSizeKey | null;
}

/** Normalize a CSS color to a token: `#rrggbb` as-is, `rgb()` folded to hex. */
function styleColorToToken(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v || v === "inherit" || v === "initial") return null;
  if (v === "transparent") return "transparent";
  if (v.startsWith("#")) return v;
  const match = v.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return null;
  const [r, g, b] = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((part) =>
      Math.max(0, Math.min(255, parseInt(part, 10)))
        .toString(16)
        .padStart(2, "0"),
    );
  return r && g && b ? `#${r}${g}${b}` : null;
}

/**
 * Read alignment, colors and font size off an exported element. `text-*` is
 * ambiguous by design in Bootstrap Email — `text-center` is alignment,
 * `text-lg` a size, `text-primary` a color — so it is resolved in that order.
 * Palette colors come from classes, custom colors from the inline style.
 */
export function parseBootstrapAttributes(
  el: HTMLElement,
): ParsedBootstrapAttributes {
  let align: ElementFormatType | null = null;
  let textColor: string | null = null;
  let bgColor: string | null = null;
  let borderColor: string | null = null;
  let fontSize: FontSizeKey | null = null;

  for (const cls of Array.from(el.classList)) {
    if (cls.startsWith("ax-")) {
      const value = cls.slice(3);
      if (ALIGNMENTS.has(value)) align = value as Align;
      continue;
    }
    if (cls.startsWith("text-")) {
      const value = cls.slice(5);
      if (ALIGNMENTS.has(value)) align = value as Align;
      else if (SIZE_KEYS.has(value)) fontSize = value as FontSizeKey;
      else if (isColorToken(value)) textColor = value;
      continue;
    }
    if (cls.startsWith("bg-") && isColorToken(cls.slice(3))) {
      bgColor = cls.slice(3);
      continue;
    }
    if (cls.startsWith("border-") && isColorToken(cls.slice(7))) {
      borderColor = cls.slice(7);
    }
  }

  const style = el.style;
  if (style) {
    textColor = styleColorToToken(style.color) ?? textColor;
    bgColor = styleColorToToken(style.backgroundColor) ?? bgColor;
    borderColor = styleColorToToken(style.borderColor) ?? borderColor;
    const px = parseInt(style.fontSize, 10);
    if (!Number.isNaN(px)) fontSize = pxToFontSizeKey(px) ?? fontSize;
  }

  return { align, textColor, bgColor, borderColor, fontSize };
}
