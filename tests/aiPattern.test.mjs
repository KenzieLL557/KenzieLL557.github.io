import test from "node:test";
import assert from "node:assert/strict";

test("buildDotPattern creates a strong deterministic square field for the hero", async () => {
  let module = {};

  try {
    module = await import("../src/aiPattern.js");
  } catch {
    // The first TDD run intentionally reaches this branch before the helper exists.
  }

  assert.equal(typeof module.buildDotPattern, "function");

  const options = { cell: 16, seed: 4187, color: "#6861f2" };
  const first = module.buildDotPattern(320, 200, options);
  const second = module.buildDotPattern(320, 200, options);

  assert.deepEqual(second, first);
  assert.ok(first.length > 60 && first.length < 220);
  assert.ok(first.every((dot) => dot.size === 4));
  assert.ok(first.every((dot) => dot.color === "#6861f2"));
  assert.ok(first.every((dot) => dot.opacity >= 0.14 && dot.opacity <= 0.32));
  assert.ok(first.every((dot) => dot.x >= 0 && dot.x < 320 && dot.y >= 0 && dot.y < 200));
});

test("buildDotPattern can inset the first dot row so it is not clipped by the header edge", async () => {
  const { buildDotPattern } = await import("../src/aiPattern.js");
  const dots = buildDotPattern(320, 200, { cell: 16, seed: 4187, offsetY: 10 });

  assert.ok(dots.length > 0);
  assert.ok(dots.every((dot) => dot.y >= 12));
  assert.ok(dots.every((dot) => dot.y + dot.size <= 200));
});
