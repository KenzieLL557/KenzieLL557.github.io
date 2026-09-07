import test from "node:test";
import assert from "node:assert/strict";

test("buildAnimatedDigits marks only the final two characters for the metric reveal", async () => {
  let module = {};

  try {
    module = await import("../src/animatedDigits.js");
  } catch {
    // The first TDD run intentionally reaches this branch before the helper exists.
  }

  assert.equal(typeof module.buildAnimatedDigits, "function");
  assert.deepEqual(module.buildAnimatedDigits("100%"), [
    { character: "1", stagger: null },
    { character: "0", stagger: null },
    { character: "0", stagger: 1 },
    { character: "%", stagger: 2 }
  ]);
});
