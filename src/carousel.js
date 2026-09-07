export function advanceCarouselIndex(current, length, direction = 1) {
  if (length <= 0) return 0;
  return (current + direction + length) % length;
}
