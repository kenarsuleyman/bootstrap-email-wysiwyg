// Headless check of the pure HR margin logic (classes, parsing, px). The
// DecoratorNode React component is exercised in the browser demo.
const { MARGIN_STEPS, DEFAULT_HR_MARGIN, hrClasses, marginKeyToPx, parseHrClasses } =
  await import("../src/marginScale.ts");

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
assert(DEFAULT_HR_MARGIN === "5", "default margin key is 5 (20px)");
assert(marginKeyToPx("5") === 20, "mt-5 -> 20px");
assert(marginKeyToPx("0") === 0, "mt-0 -> 0px");
assert(marginKeyToPx("40") === 160, "mt-40 -> 160px");
assert(marginKeyToPx(null) === 0, "null -> 0px");
assert(MARGIN_STEPS.length === 17, "17 margin steps");

// --- Class output (separate mt-/mb-, never my-) ----------------------------
eq(hrClasses("5", "5"), ["mt-5", "mb-5"], "default -> mt-5 mb-5");
eq(hrClasses("0", "10"), ["mt-0", "mb-10"], "asymmetric -> mt-0 mb-10");

// --- Class parsing (HTML import) ------------------------------------------
eq(parseHrClasses([]), { top: "5", bottom: "5" }, "no classes -> default 20px");
eq(parseHrClasses(["mt-8", "mb-2"]), { top: "8", bottom: "2" }, "mt-8 mb-2 parsed");
eq(parseHrClasses(["my-0"]), { top: "0", bottom: "0" }, "my-0 sets both");
eq(parseHrClasses(["my-6", "mb-3"]), { top: "6", bottom: "3" }, "mb overrides my for bottom");

console.log(`\nAll ${count} assertions passed.`);
