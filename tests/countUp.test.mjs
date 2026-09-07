import test from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, parseMetricTarget, formatMetricCount } from "../src/countUp.js";

test("metric labels retain their prefix and suffix while extracting the target", () => {
  assert.deepEqual(parseMetricTarget("约 6 个"), { prefix: "约 ", target: 6, suffix: " 个" });
  assert.deepEqual(parseMetricTarget("100%"), { prefix: "", target: 100, suffix: "%" });
});

test("count values use cubic ease-out and thousands separators", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(.5), .875);
  assert.equal(formatMetricCount(12345, { prefix: "", suffix: "%" }), "12,345%");
});
