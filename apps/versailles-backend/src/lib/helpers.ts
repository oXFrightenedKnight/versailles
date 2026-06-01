export function roundToNearestDecimal(num: number, decimal: number) {
  return Math.round(num * decimal) / decimal;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
