export function roundToNearestDecimal(num: number, decimal: number) {
  return Math.round(num * decimal) / decimal;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function checkIsDecimal(value: number) {
  return Number.isFinite(value) && !Number.isInteger(value);
}

export function getMaxAffordableAmount(budget: number, getCost: (amount: number) => number) {
  let low = 0;
  let high = 1;

  // find highest cost
  while (getCost(high) <= budget) {
    low = high;
    high *= 2;
  }

  // keep iterating until low and high meet
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);

    if (getCost(mid) <= budget) {
      low = mid;
    } else {
      // skip mid since we already checked it
      high = mid - 1;
    }
  }

  return low;
}
