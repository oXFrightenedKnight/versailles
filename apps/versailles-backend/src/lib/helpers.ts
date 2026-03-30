export function roundToNearestDecimal(num: number, decimal: number) {
  return Math.round(num * decimal) / decimal;
}
