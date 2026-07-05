import type { ElementFormatType } from "lexical";

export type Align = "left" | "center" | "right" | "justify";

/** Collapse Lexical's element format into a Bootstrap Email alignment, or null. */
export function normalizeAlign(format: ElementFormatType): Align | null {
  switch (format) {
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
      return "justify";
    case "left":
      return "left";
    // Logical directions map to physical ones for LTR email content.
    case "start":
      return "left";
    case "end":
      return "right";
    default:
      return null;
  }
}

/** Bootstrap Email text-alignment class for a block of inline text. */
export function textAlignClass(format: ElementFormatType): string | null {
  const align = normalizeAlign(format);
  return align ? `text-${align}` : null;
}

/**
 * Bootstrap Email horizontal-alignment class for block content (buttons,
 * images). `justify` is meaningless here, so it yields no class.
 */
export function axAlignClass(format: ElementFormatType): string | null {
  const align = normalizeAlign(format);
  if (!align || align === "justify") return null;
  return `ax-${align}`;
}
