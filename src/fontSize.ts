// Bootstrap Email font-size scale (.text-xs … .text-7xl). "base" (16px) is the
// default, represented as no class / no inline style.

export const FONT_SIZE_KEYS = [
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
] as const;

export type FontSizeKey = (typeof FONT_SIZE_KEYS)[number];

const PX: Record<FontSizeKey, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 64,
  "7xl": 80,
};

export const BASE_FONT_SIZE: FontSizeKey = "base";

function isFontSizeKey(value: string): value is FontSizeKey {
  return (FONT_SIZE_KEYS as readonly string[]).includes(value);
}

export function fontSizePx(key: FontSizeKey): number {
  return PX[key];
}

/** Class for a size key, or null for the default ("base"). */
export function fontSizeClass(key: string | null | undefined): string | null {
  if (!key || key === "base" || !isFontSizeKey(key)) return null;
  return `text-${key}`;
}

/** Match a pixel size back to a scale key, or null if off-scale. */
export function pxToFontSizeKey(px: number): FontSizeKey | null {
  return FONT_SIZE_KEYS.find((key) => PX[key] === px) ?? null;
}

/**
 * Step a size one notch up (+1) or down (-1) the scale, clamped at the ends.
 * A null/unknown current size is treated as "base".
 */
export function stepFontSize(
  current: string | null | undefined,
  direction: 1 | -1,
): FontSizeKey {
  const key = current && isFontSizeKey(current) ? current : BASE_FONT_SIZE;
  const index = FONT_SIZE_KEYS.indexOf(key);
  const next = Math.max(
    0,
    Math.min(FONT_SIZE_KEYS.length - 1, index + direction),
  );
  return FONT_SIZE_KEYS[next];
}
