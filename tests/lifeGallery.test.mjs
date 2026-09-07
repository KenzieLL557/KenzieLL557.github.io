import test from "node:test";
import assert from "node:assert/strict";
import * as lifeGallery from "../src/lifeGallery.js";

test("classifies natural photo ratios without changing them", () => {
  assert.equal(lifeGallery.classifyPhotoAspect(1600, 900), "landscape");
  assert.equal(lifeGallery.classifyPhotoAspect(900, 1600), "portrait");
  assert.equal(lifeGallery.classifyPhotoAspect(1200, 1100), "square");
});

test("assigns wider exposure cells without cropping source pixels", () => {
  assert.deepEqual(lifeGallery.getFilmFrameWidth("landscape"), { width: 312, fit: "contain" });
  assert.deepEqual(lifeGallery.getFilmFrameWidth("portrait"), { width: 172, fit: "contain" });
  assert.deepEqual(lifeGallery.getFilmFrameWidth("square"), { width: 238, fit: "contain" });
});

test("wraps either direction into one repeated film sequence", () => {
  assert.equal(lifeGallery.wrapFilmOffset(1010, 1000), 10);
  assert.equal(lifeGallery.wrapFilmOffset(-12, 1000), 988);
  assert.equal(lifeGallery.wrapFilmOffset(500, 1000), 500);
});

test("maps vertical and horizontal wheel input into bounded Life scroll positions", () => {
  assert.equal(typeof lifeGallery.getLifeWheelScrollState, "function");
  assert.deepEqual(
    lifeGallery.getLifeWheelScrollState({ scrollLeft: 120, scrollWidth: 1800, clientWidth: 800, deltaX: 0, deltaY: 90 }),
    { scrollLeft: 210, shouldPrevent: true }
  );
  assert.deepEqual(
    lifeGallery.getLifeWheelScrollState({ scrollLeft: 500, scrollWidth: 1800, clientWidth: 800, deltaX: -160, deltaY: 40 }),
    { scrollLeft: 340, shouldPrevent: true }
  );
  assert.deepEqual(
    lifeGallery.getLifeWheelScrollState({ scrollLeft: 1000, scrollWidth: 1800, clientWidth: 800, deltaX: 0, deltaY: 120 }),
    { scrollLeft: 1000, shouldPrevent: false }
  );
});

test("derives reachable keyboard targets for a finite Life track", () => {
  assert.equal(typeof lifeGallery.getLifeKeyboardScrollTarget, "function");
  assert.equal(
    lifeGallery.getLifeKeyboardScrollTarget({ key: "ArrowRight", scrollLeft: 120, scrollWidth: 2000, clientWidth: 1000 }),
    300
  );
  assert.equal(
    lifeGallery.getLifeKeyboardScrollTarget({ key: "ArrowLeft", scrollLeft: 120, scrollWidth: 2000, clientWidth: 1000 }),
    0
  );
  assert.equal(
    lifeGallery.getLifeKeyboardScrollTarget({ key: "End", scrollLeft: 120, scrollWidth: 2000, clientWidth: 1000 }),
    1000
  );
  assert.equal(
    lifeGallery.getLifeKeyboardScrollTarget({ key: "PageDown", scrollLeft: 120, scrollWidth: 2000, clientWidth: 1000 }),
    null
  );
});

test("starts Life drag only for an unmodified primary-pointer track target", () => {
  assert.equal(typeof lifeGallery.canStartLifeDrag, "function");
  const trackTarget = { closest: () => null };
  const resetButtonTarget = { closest: () => ({}) };

  assert.equal(lifeGallery.canStartLifeDrag({ isPrimary: true, button: 0, target: trackTarget }), true);
  assert.equal(lifeGallery.canStartLifeDrag({ isPrimary: false, button: 0, target: trackTarget }), false);
  assert.equal(lifeGallery.canStartLifeDrag({ isPrimary: true, button: 1, target: trackTarget }), false);
  assert.equal(lifeGallery.canStartLifeDrag({ isPrimary: true, button: 0, target: resetButtonTarget }), false);
});

test("wraps focus only at the Life dialog boundaries", () => {
  assert.equal(typeof lifeGallery.getLifeFocusLoopTarget, "function");
  assert.equal(lifeGallery.getLifeFocusLoopTarget({ focusableCount: 3, activeIndex: 0, shiftKey: true }), 2);
  assert.equal(lifeGallery.getLifeFocusLoopTarget({ focusableCount: 3, activeIndex: 2, shiftKey: false }), 0);
  assert.equal(lifeGallery.getLifeFocusLoopTarget({ focusableCount: 3, activeIndex: 1, shiftKey: false }), null);
  assert.equal(lifeGallery.getLifeFocusLoopTarget({ focusableCount: 0, activeIndex: -1, shiftKey: true }), null);
});

test("resets the Life track without smooth motion when reduced motion is requested", () => {
  assert.equal(typeof lifeGallery.getLifeResetOptions, "function");
  assert.deepEqual(lifeGallery.getLifeResetOptions(false), { left: 0, behavior: "smooth" });
  assert.deepEqual(lifeGallery.getLifeResetOptions(true), { left: 0, behavior: "auto" });
});

test("damps Life scroll toward its user-selected target without overshooting", () => {
  assert.deepEqual(
    lifeGallery.getDampedScrollStep({ current: 120, target: 220, factor: 0.2 }),
    { scrollLeft: 140, settled: false }
  );
  assert.deepEqual(
    lifeGallery.getDampedScrollStep({ current: 219.7, target: 220, factor: 0.2 }),
    { scrollLeft: 220, settled: true }
  );
  assert.deepEqual(
    lifeGallery.getDampedScrollStep({ current: 260, target: 220, factor: 0.25 }),
    { scrollLeft: 250, settled: false }
  );
});

test("projects short bounded pointer momentum and wraps lightbox navigation", () => {
  assert.equal(
    lifeGallery.getLifeMomentumTarget({ scrollLeft: 480, velocity: 0.5, scrollWidth: 1800, clientWidth: 800 }),
    590
  );
  assert.equal(
    lifeGallery.getLifeMomentumTarget({ scrollLeft: 960, velocity: 1, scrollWidth: 1800, clientWidth: 800 }),
    1000
  );
  assert.equal(lifeGallery.getWrappedPhotoIndex(0, -1, 8), 7);
  assert.equal(lifeGallery.getWrappedPhotoIndex(7, 1, 8), 0);
  assert.equal(lifeGallery.getWrappedPhotoIndex(2, 1, 8), 3);
});
