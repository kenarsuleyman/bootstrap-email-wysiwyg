// Bootstrap Email vertical margin scale (mt-*/mb-*/my-*), used for HR spacing.

export interface MarginStep {
  key: string;
  px: number;
}

export const MARGIN_STEPS: MarginStep[] = [
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
];

/** A plain `<hr>` has 20px top/bottom spacing; mt-5 / mb-5 = 20px. */
export const DEFAULT_HR_MARGIN = "5";

export function marginKeyToPx(key: string | null): number {
  return MARGIN_STEPS.find((s) => s.key === key)?.px ?? 0;
}

/** Classes for an HR's spacing — separate `mt-` / `mb-` rather than `my-`. */
export function hrClasses(top: string, bottom: string): string[] {
  return [`mt-${top}`, `mb-${bottom}`];
}

/** Read top/bottom margin keys from an HR's classes (my-* sets both). */
export function parseHrClasses(classNames: string[]): {
  top: string;
  bottom: string;
} {
  let top = DEFAULT_HR_MARGIN;
  let bottom = DEFAULT_HR_MARGIN;
  for (const cls of classNames) {
    const my = cls.match(/^my-(.+)$/);
    const mt = cls.match(/^mt-(.+)$/);
    const mb = cls.match(/^mb-(.+)$/);
    if (my) {
      top = my[1];
      bottom = my[1];
    } else if (mt) {
      top = mt[1];
    } else if (mb) {
      bottom = mb[1];
    }
  }
  return { top, bottom };
}
