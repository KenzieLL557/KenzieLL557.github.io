export function buildDotPattern(width, height, options = {}) {
  const {
    cell = 16,
    size = 4,
    seed = 4187,
    color = "#6861f2",
    offsetY = 0
  } = options;
  const dots = [];
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);

  const noise = (column, row) => {
    let value = Math.imul(column + seed, 374761393) + Math.imul(row + seed, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const value = noise(column, row);
      if (value < 0.46) continue;
      dots.push({
        x: column * cell + 2,
        y: row * cell + 2 + offsetY,
        size,
        color,
        opacity: 0.14 + ((value - 0.46) / 0.54) * 0.18
      });
    }
  }

  return dots.filter((dot) => dot.y + dot.size <= height);
}
