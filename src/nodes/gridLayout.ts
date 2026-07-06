// Column-width math for the Bootstrap Email 12-unit grid. Pure functions with
// no Lexical/DOM dependencies so they're trivially testable and reusable.
//
// Every row totals exactly 12 units. Columns are kept as even as possible:
// widths within a row never differ by more than 1 unit, and any remainder is
// pushed onto the trailing columns (so 5 columns become 2·2·2·3·3, i.e. the
// last ones are the "slightly bigger" ones).

/** Total width units in a Bootstrap Email row. */
export const GRID_UNITS = 12;

/** A row can hold at most 12 columns (each at least `col-1`). */
export const MAX_COLUMNS = GRID_UNITS;

/** Clamp a column count into the range a row can actually hold. */
export function clampColumnCount(count: number): number {
  return Math.max(1, Math.min(Math.floor(count), MAX_COLUMNS));
}

/**
 * Split `total` units across `count` slots as evenly as possible. The base
 * width is `floor(total / count)`; the leftover units are added one-by-one to
 * the trailing slots, so widths differ by at most 1 and the wider slots sit at
 * the end. Assumes `count >= 1` and `count <= total`.
 */
function split(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  let remainder = total - base * count;
  const spans = new Array<number>(count).fill(base);
  for (let i = count - 1; remainder > 0; i--, remainder--) {
    spans[i] += 1;
  }
  return spans;
}

/**
 * The even width distribution for `count` columns. Used whenever the column
 * count changes (add / remove), which resets custom widths to the most
 * balanced layout — e.g. two `6·6` columns plus one more become `4·4·4`, and
 * five columns become `2·2·2·3·3`.
 */
export function distributeSpans(count: number): number[] {
  return split(GRID_UNITS, clampColumnCount(count));
}

/**
 * Resize the column at `index` to `target` units and re-balance the rest so the
 * row still totals 12. `target` is clamped to `[1, 12 - (n - 1)]` so every other
 * column keeps at least 1 unit. The remaining units are spread evenly across the
 * sibling columns (order preserved). A single-column row is always `[12]`.
 */
export function resizeSpans(
  spans: readonly number[],
  index: number,
  target: number,
): number[] {
  const n = spans.length;
  if (n <= 1) return [GRID_UNITS];

  const maxForOne = GRID_UNITS - (n - 1);
  const span = Math.max(1, Math.min(Math.round(target), maxForOne));
  const others = split(GRID_UNITS - span, n - 1);

  const result: number[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    result.push(i === index ? span : others[j++]);
  }
  return result;
}
