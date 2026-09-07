import test from "node:test";
import assert from "node:assert/strict";
import { advanceCarouselIndex } from "../src/carousel.js";

test("carousel navigation wraps in both directions", () => {
  assert.equal(advanceCarouselIndex(0, 4, 1), 1);
  assert.equal(advanceCarouselIndex(3, 4, 1), 0);
  assert.equal(advanceCarouselIndex(0, 4, -1), 3);
});
