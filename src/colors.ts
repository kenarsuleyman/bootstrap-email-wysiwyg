// Bootstrap Email color palette + conversion between the three representations
// we juggle: a "token" (e.g. "blue-500" or "primary", or a raw "#rrggbb"),
// the CSS hex used for live editor rendering, and the Bootstrap Email class.

export interface Swatch {
  /** Token stored on nodes, e.g. "blue-500", "primary", or a custom "#a1b2c3". */
  token: string;
  hex: string;
}

export interface ColorFamily {
  name: string;
  /** Shades ordered light → dark (100 → 900). */
  shades: { shade: number; token: string; hex: string }[];
}

/** Contextual + absolute colors shown as the top row of the picker. */
export const BASE_COLORS: Swatch[] = [
  { token: "primary", hex: "#0d6efd" },
  { token: "secondary", hex: "#6c757d" },
  { token: "success", hex: "#198754" },
  { token: "info", hex: "#0dcaf0" },
  { token: "warning", hex: "#ffc107" },
  { token: "danger", hex: "#dc3545" },
  { token: "light", hex: "#f8f9fa" },
  { token: "dark", hex: "#212529" },
  { token: "black", hex: "#000000" },
  { token: "white", hex: "#ffffff" },
  { token: "transparent", hex: "transparent" },
];

const RAW_FAMILIES: Record<string, string[]> = {
  gray: ["#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#6c757d", "#495057", "#343a40", "#212529"],
  blue: ["#cfe2ff", "#9ec5fe", "#6ea8fe", "#3d8bfd", "#0d6efd", "#0a58ca", "#084298", "#052c65", "#031633"],
  indigo: ["#e0cffc", "#c29ffa", "#a370f7", "#8540f5", "#6610f2", "#520dc2", "#3d0a91", "#290661", "#140330"],
  purple: ["#e2d9f3", "#c5b3e6", "#a98eda", "#8c68cd", "#6f42c1", "#59359a", "#432874", "#2c1a4d", "#160d27"],
  pink: ["#f7d6e6", "#efadce", "#e685b5", "#de5c9d", "#d63384", "#ab296a", "#801f4f", "#561435", "#2b0a1a"],
  red: ["#f8d7da", "#f1aeb5", "#ea868f", "#e35d6a", "#dc3545", "#b02a37", "#842029", "#58151c", "#2c0b0e"],
  orange: ["#ffe5d0", "#fecba1", "#feb272", "#fd9843", "#fd7e14", "#ca6510", "#984c0c", "#653208", "#331904"],
  yellow: ["#fff3cd", "#ffe69c", "#ffda6a", "#ffcd39", "#ffc107", "#cc9a06", "#997404", "#664d03", "#332701"],
  green: ["#d1e7dd", "#a3cfbb", "#75b798", "#479f76", "#198754", "#146c43", "#0f5132", "#0a3622", "#051b11"],
  teal: ["#d2f4ea", "#a6e9d5", "#79dfc1", "#4dd4ac", "#20c997", "#1aa179", "#13795b", "#0d503c", "#06281e"],
  cyan: ["#cff4fc", "#9eeaf9", "#6edff6", "#3dd5f3", "#0dcaf0", "#0aa2c0", "#087990", "#055160", "#032830"],
};

export const COLOR_FAMILIES: ColorFamily[] = Object.entries(RAW_FAMILIES).map(
  ([name, hexes]) => ({
    name,
    shades: hexes.map((hex, i) => {
      const shade = (i + 1) * 100;
      return { shade, token: `${name}-${shade}`, hex };
    }),
  }),
);

// --- Lookup tables ---------------------------------------------------------

const TOKEN_TO_HEX = new Map<string, string>();
for (const base of BASE_COLORS) TOKEN_TO_HEX.set(base.token, base.hex);
for (const family of COLOR_FAMILIES) {
  for (const s of family.shades) TOKEN_TO_HEX.set(s.token, s.hex);
}

// hex → token. Families registered first, base colors override on collision so
// e.g. #0d6efd resolves to the idiomatic "primary" rather than "blue-500".
const HEX_TO_TOKEN = new Map<string, string>();
for (const family of COLOR_FAMILIES) {
  for (const s of family.shades) HEX_TO_TOKEN.set(s.hex.toLowerCase(), s.token);
}
for (const base of BASE_COLORS) HEX_TO_TOKEN.set(base.hex.toLowerCase(), base.token);

export function isHexToken(token: string): boolean {
  return token.startsWith("#");
}

/** CSS color for live rendering. */
export function tokenToHex(token: string): string {
  if (isHexToken(token) || token === "transparent") return token;
  return TOKEN_TO_HEX.get(token) ?? token;
}

export type ColorKind = "text" | "bg" | "border";

/** Bootstrap Email class for a palette token, or null for custom hex colors. */
export function tokenToClass(token: string, kind: ColorKind): string | null {
  if (isHexToken(token)) return null;
  // Class prefixes match the kind exactly: text-*, bg-*, border-*.
  return `${kind}-${token}`;
}

/** Reverse a rendered hex back to a palette token, or null if not in palette. */
export function hexToToken(hex: string): string | null {
  return HEX_TO_TOKEN.get(hex.toLowerCase()) ?? null;
}

/**
 * Resolve a text/bg color token into the classes and inline styles needed on
 * an exported element (palette → class, custom → inline style).
 */
export function colorAttributes(
  textToken?: string | null,
  bgToken?: string | null,
  borderToken?: string | null,
): { classes: string[]; style: string } {
  const classes: string[] = [];
  const styles: string[] = [];
  if (textToken) {
    const cls = tokenToClass(textToken, "text");
    if (cls) classes.push(cls);
    else styles.push(`color: ${tokenToHex(textToken)}`);
  }
  if (bgToken) {
    const cls = tokenToClass(bgToken, "bg");
    if (cls) classes.push(cls);
    else styles.push(`background-color: ${tokenToHex(bgToken)}`);
  }
  if (borderToken) {
    const cls = tokenToClass(borderToken, "border");
    if (cls) classes.push(cls);
    else styles.push(`border-color: ${tokenToHex(borderToken)}`);
  }
  return { classes, style: styles.join("; ") };
}
