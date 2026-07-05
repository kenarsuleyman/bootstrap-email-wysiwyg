// Bootstrap Email sizing scale (w-*/h-*/max-w-*) and image sizing modes.

export type ImageMode = "fluid" | "fixed" | "max";

export interface SizeStep {
  key: string;
  px: number;
}

/** The discrete Bootstrap Email sizing scale (w-0 … w-150). */
export const SIZE_STEPS: SizeStep[] = [
  { key: "0", px: 0 },
  { key: "1", px: 4 },
  { key: "2", px: 8 },
  { key: "3", px: 12 },
  { key: "4", px: 16 },
  { key: "5", px: 20 },
  { key: "6", px: 24 },
  { key: "7", px: 28 },
  { key: "8", px: 32 },
  { key: "9", px: 36 },
  { key: "10", px: 40 },
  { key: "12", px: 48 },
  { key: "16", px: 64 },
  { key: "20", px: 80 },
  { key: "24", px: 96 },
  { key: "32", px: 128 },
  { key: "40", px: 160 },
  { key: "48", px: 192 },
  { key: "56", px: 224 },
  { key: "64", px: 256 },
  { key: "80", px: 320 },
  { key: "96", px: 384 },
  { key: "112", px: 448 },
  { key: "128", px: 512 },
  { key: "144", px: 576 },
  { key: "150", px: 600 },
];

export function sizeKeyToPx(key: string | null): number | null {
  if (!key) return null;
  return SIZE_STEPS.find((s) => s.key === key)?.px ?? null;
}

/** Index of a size key in the scale, or a fallback index if unknown. */
export function sizeIndex(key: string | null, fallback = 0): number {
  const index = SIZE_STEPS.findIndex((s) => s.key === key);
  return index === -1 ? fallback : index;
}

export function sizeKeyAtIndex(index: number): string {
  const clamped = Math.max(0, Math.min(SIZE_STEPS.length - 1, index));
  return SIZE_STEPS[clamped].key;
}

/** Bootstrap Email classes for an image's sizing. */
export function imageClasses(
  mode: ImageMode,
  width: string | null,
  height: string | null,
): string[] {
  if (mode === "fixed") {
    const classes: string[] = [];
    if (width) classes.push(`w-${width}`);
    if (height) classes.push(`h-${height}`);
    return classes.length ? classes : ["img-fluid"];
  }
  if (mode === "max") {
    return width ? [`max-w-${width}`, "w-full"] : ["img-fluid"];
  }
  return ["img-fluid"];
}

/** Infer sizing mode + values from an image's class list (for HTML import). */
export function parseImageClasses(classNames: string[]): {
  mode: ImageMode;
  width: string | null;
  height: string | null;
} {
  let mode: ImageMode = "fluid";
  let width: string | null = null;
  let height: string | null = null;
  for (const cls of classNames) {
    const max = cls.match(/^max-w-(.+)$/);
    const w = cls.match(/^w-(.+)$/);
    const h = cls.match(/^h-(.+)$/);
    if (max && max[1] !== "full") {
      mode = "max";
      width = max[1];
    } else if (w && w[1] !== "full" && w[1] !== "auto") {
      mode = "fixed";
      width = w[1];
    } else if (h && h[1] !== "full" && h[1] !== "auto") {
      mode = "fixed";
      height = h[1];
    }
  }
  return { mode, width, height };
}

/** Inline styles mirroring {@link imageClasses}, for live editor preview. */
export function imagePreviewStyle(
  mode: ImageMode,
  width: string | null,
  height: string | null,
): Record<string, string> {
  if (mode === "fixed") {
    // One axis is set; the other stays auto to preserve aspect ratio.
    const w = sizeKeyToPx(width);
    const h = sizeKeyToPx(height);
    if (w !== null) return { width: `${w}px`, height: "auto" };
    if (h !== null) return { width: "auto", height: `${h}px` };
    return { width: "auto", height: "auto" };
  }
  if (mode === "max") {
    const w = sizeKeyToPx(width);
    return {
      maxWidth: w !== null ? `${w}px` : "100%",
      width: "100%",
      height: "auto",
    };
  }
  return { maxWidth: "100%", width: "100%", height: "auto" };
}
