import { Hex, PRODUCIBLE_RESOURCE, ResourceRates } from "@repo/shared";

export function calculateResourceOutput(
  hex: Hex,
  resource: PRODUCIBLE_RESOURCE,
  productionEfficiency?: number
) {
  if (hex.population === null) return 0;
  const baseResourceRate = ResourceRates[resource];
  return Math.round(hex.population * (baseResourceRate ?? 0) * (productionEfficiency ?? 1));
}
