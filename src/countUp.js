export function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

export function parseMetricTarget(value) {
  const match = String(value).match(/^(.*?)([\d,]+)([^\d]*)$/);
  if (!match) return { prefix: "", target: 0, suffix: String(value) };
  return {
    prefix: match[1],
    target: Number(match[2].replaceAll(",", "")),
    suffix: match[3]
  };
}

export function formatMetricCount(value, { prefix = "", suffix = "" }) {
  return `${prefix}${Math.round(value).toLocaleString("en-US")}${suffix}`;
}
