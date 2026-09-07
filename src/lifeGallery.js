const FRAME_GEOMETRY = {
  landscape: { width: 312, fit: "contain" },
  portrait: { width: 172, fit: "contain" },
  square: { width: 238, fit: "contain" }
};

export function classifyPhotoAspect(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "square";
  const ratio = width / height;
  if (ratio >= 1.2) return "landscape";
  if (ratio <= 0.82) return "portrait";
  return "square";
}

export function getFilmFrameWidth(kind) {
  return FRAME_GEOMETRY[kind] || FRAME_GEOMETRY.square;
}

export function wrapFilmOffset(offset, sequenceWidth) {
  if (!Number.isFinite(sequenceWidth) || sequenceWidth <= 0) return 0;
  return ((offset % sequenceWidth) + sequenceWidth) % sequenceWidth;
}

function getMaxScrollLeft(scrollWidth, clientWidth) {
  return Math.max(0, scrollWidth - clientWidth);
}

function clampScrollLeft(scrollLeft, scrollWidth, clientWidth) {
  return Math.max(0, Math.min(scrollLeft, getMaxScrollLeft(scrollWidth, clientWidth)));
}

export function getDampedScrollStep({ current, target, factor = 0.18 }) {
  if (Math.abs(target - current) <= 0.5) return { scrollLeft: target, settled: true };
  return { scrollLeft: current + ((target - current) * factor), settled: false };
}

export function getLifeMomentumTarget({ scrollLeft, velocity = 0, scrollWidth, clientWidth }) {
  const projectedVelocity = Math.max(-1.2, Math.min(1.2, velocity));
  return clampScrollLeft(scrollLeft + (projectedVelocity * 220), scrollWidth, clientWidth);
}

export function getWrappedPhotoIndex(index, direction, photoCount) {
  if (!Number.isInteger(photoCount) || photoCount <= 0) return 0;
  return ((index + direction) % photoCount + photoCount) % photoCount;
}

export function getLifeWheelScrollState({ scrollLeft, scrollWidth, clientWidth, deltaX = 0, deltaY = 0 }) {
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  const nextScrollLeft = clampScrollLeft(scrollLeft + delta, scrollWidth, clientWidth);
  return { scrollLeft: nextScrollLeft, shouldPrevent: nextScrollLeft !== scrollLeft };
}

export function getLifeKeyboardScrollTarget({ key, scrollLeft, scrollWidth, clientWidth }) {
  const step = Math.max(160, Math.round(clientWidth * 0.18));
  if (key === "ArrowRight") return clampScrollLeft(scrollLeft + step, scrollWidth, clientWidth);
  if (key === "ArrowLeft") return clampScrollLeft(scrollLeft - step, scrollWidth, clientWidth);
  if (key === "Home") return 0;
  if (key === "End") return getMaxScrollLeft(scrollWidth, clientWidth);
  return null;
}

export function canStartLifeDrag({ isPrimary = true, button = 0, target }) {
  if (!isPrimary || button !== 0) return false;
  return !target?.closest?.("button, a, input, select, textarea, [contenteditable='true'], [role='button']");
}

export function getLifeFocusLoopTarget({ focusableCount, activeIndex, shiftKey }) {
  if (!focusableCount) return null;
  if (shiftKey && activeIndex === 0) return focusableCount - 1;
  if (!shiftKey && activeIndex === focusableCount - 1) return 0;
  return null;
}

export function getLifeResetOptions(shouldReduceMotion) {
  return { left: 0, behavior: shouldReduceMotion ? "auto" : "smooth" };
}
