import test from "node:test";
import assert from "node:assert/strict";
import { clampComparisonSplit } from "../src/imageInteractions.js";

test("comparison split remains inside the image frame", () => {
  assert.equal(clampComparisonSplit(-12), 0);
  assert.equal(clampComparisonSplit(54), 54);
  assert.equal(clampComparisonSplit(128), 100);
});
