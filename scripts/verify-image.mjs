// Headless check of the pure image sizing logic (classes, preview styles,
// class parsing for import). The DecoratorNode's React component is exercised
// in the browser demo, not here.
const {
  imageClasses,
  imagePreviewStyle,
  parseImageClasses,
  sizeKeyToPx,
  sizeKeyAtIndex,
  SIZE_STEPS,
} = await import("../src/imageSize.ts");

let count = 0;
const assert = (cond, msg) => {
  count++;
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
};
const eq = (a, b, msg) =>
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)})`);

// --- Scale -----------------------------------------------------------------
assert(sizeKeyToPx("64") === 256, "w-64 -> 256px");
assert(sizeKeyToPx("150") === 600, "w-150 -> 600px");
assert(sizeKeyToPx(null) === null, "null size -> null px");
assert(sizeKeyAtIndex(0) === "0" && sizeKeyAtIndex(999) === "150", "index clamps");

// --- Classes per mode ------------------------------------------------------
eq(imageClasses("fluid", null, null), ["img-fluid"], "fluid -> img-fluid");
eq(imageClasses("fixed", "64", null), ["w-64"], "fixed width only -> w-64");
eq(imageClasses("fixed", "64", "48"), ["w-64", "h-48"], "fixed w+h -> w-64 h-48");
eq(imageClasses("fixed", null, null), ["img-fluid"], "fixed with nothing -> img-fluid");
eq(imageClasses("max", "96", null), ["max-w-96", "w-full"], "max -> max-w-96 w-full");

// --- Preview styles --------------------------------------------------------
eq(
  imagePreviewStyle("fluid", null, null),
  { maxWidth: "100%", width: "100%", height: "auto" },
  "fluid preview style",
);
eq(
  imagePreviewStyle("fixed", "64", null),
  { width: "256px", height: "auto" },
  "fixed width -> height auto",
);
eq(
  imagePreviewStyle("fixed", null, "48"),
  { width: "auto", height: "192px" },
  "fixed height -> width auto",
);
eq(
  imagePreviewStyle("max", "96", null),
  { maxWidth: "384px", width: "100%", height: "auto" },
  "max preview style",
);

// --- Class parsing (HTML import) ------------------------------------------
eq(parseImageClasses(["img-fluid"]), { mode: "fluid", width: null, height: null }, "parse img-fluid");
eq(parseImageClasses(["w-48"]), { mode: "fixed", width: "48", height: null }, "parse w-48");
eq(parseImageClasses(["w-48", "h-32"]), { mode: "fixed", width: "48", height: "32" }, "parse w+h");
eq(
  parseImageClasses(["max-w-64", "w-full"]),
  { mode: "max", width: "64", height: null },
  "parse max-w-64 w-full (max wins, w-full ignored)",
);

assert(SIZE_STEPS.length === 26, "26 size steps");

console.log(`\nAll ${count} assertions passed.`);
