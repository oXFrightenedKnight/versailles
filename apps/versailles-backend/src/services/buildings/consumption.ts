import { Building, BUILDINGS, getBuildingName, PRODUCIBLE_RESOURCE } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { AllocatedContractResources } from "./types";

export function calculateEfficiency(
  building: Building,
  receivedResources: AllocatedContractResources
) {
  const name = getBuildingName(building.category, building.level);
  if (!name) return 0;

  const consuming = BUILDINGS[name].consuming;
  if (!consuming) return 1; // return 100% efficiency if building does not consume anything

  const totalWeight = typedEntries(consuming).reduce((acc, [_, c]) => acc + (c?.weight ?? 0), 0);
  if (totalWeight === 0) return 1;

  let weightedEfficiency = 0;

  for (const [resource, c] of typedEntries(consuming)) {
    const weight = c?.weight ?? 0;

    const receivedResource = receivedResources[resource] ?? 0;
    const neededResource = consuming[resource]?.amount ?? 0;

    // cap efficiency at 1
    const ratio = neededResource > 0 ? Math.min(1, receivedResource / neededResource) : 1;

    weightedEfficiency += weight * Math.max(0, ratio);
  }

  return weightedEfficiency / totalWeight;
}

export function addConsumptionStat(
  building: Building,
  resource: PRODUCIBLE_RESOURCE,
  amount: number
) {
  const consumedMap = new Map(building.statistics.consumed.map((c) => [c.resource, c]));

  const objRef = consumedMap.get(resource);
  if (!objRef) {
    building.statistics.consumed.push({ amount, resource });
  } else {
    objRef.amount += amount;
  }
}
