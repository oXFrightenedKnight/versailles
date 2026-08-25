import {
  BUILDINGS,
  getNationResource,
  Nation,
  NATION_RESOURCE,
  PRODUCIBLE_RESOURCE,
} from "@repo/shared";

export function calculateResourceOutput(
  resource: PRODUCIBLE_RESOURCE,
  buildingName: string,
  productionEfficiency?: number
) {
  const defProduction = BUILDINGS[buildingName].producing?.[resource];
  return Math.round((defProduction ?? 0) * (productionEfficiency ?? 1));
}

export function adjustNationResource(nation: Nation, resource: NATION_RESOURCE, delta: number) {
  const curr = getNationResource(nation, resource);

  const nextValue = Math.max(0, curr + delta);
  nation.resources[resource] = nextValue;

  return nextValue;
}

export function trySpendNationResource(nation: Nation, resource: NATION_RESOURCE, amount: number) {
  const curr = getNationResource(nation, resource);

  if (curr < amount) {
    return { ok: false };
  } else {
    adjustNationResource(nation, resource, -amount);
    return { ok: true };
  }
}
