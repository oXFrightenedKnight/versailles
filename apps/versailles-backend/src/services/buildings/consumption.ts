import { roundToNearestDecimal } from "#lib/helpers.js";
import { GameCtx } from "#trpc/index.js";
import {
  Building,
  findBuildingNameByCategory,
  BUILDINGS,
  BASE_RESOURCE,
  estimateConsumption,
  PRODUCIBLE_RESOURCE,
} from "@repo/shared";

export function calculateConsumption({
  building,
  gameCtx,
}: {
  building: Building;
  gameCtx: GameCtx;
}) {
  const { mapHexes } = gameCtx;

  // this function calculates and applies consumption, returning the consumed ratio
  // later we use that ratio to multiply our output.

  const storage = building.storage;

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });

  const consuming = Object.keys(BUILDINGS[name].consumptionMod) as BASE_RESOURCE[];
  const estConsumption = estimateConsumption({ building, mapHexes });
  if (!estConsumption || !name || !storage) {
    return {};
  }

  let estConsumptionRatio = new Map<string, number>();
  for (const resource of consuming) {
    const currStoredResource = storage.find((s) => s.type === resource);
    if (!currStoredResource) continue;
    // don't add a resource if it can't be stored and doesn't have a maximum cap
    const storageCap = BUILDINGS[name].storageCap[resource];
    if (!storageCap || storageCap === 0) continue;

    // consume resource
    const left = Math.round(
      Math.max(currStoredResource.amount - (estConsumption[resource] ?? 0), 0)
    );
    const consumed = Math.max(currStoredResource.amount - left, 0); // just in case

    addConsumptionStat(building, resource, consumed);
    console.log("consumed this turn", consumed);

    currStoredResource.amount = left;

    const need = estConsumption[resource] ?? 0;

    const ratio = need > 0 ? consumed / need : 1;
    estConsumptionRatio.set(
      resource,
      roundToNearestDecimal(ratio, 100) // to hundredth
    );
  }

  return Object.fromEntries(estConsumptionRatio);
}

export function calculateAverageConsumption(consumptionMod: Record<string, number>) {
  let avgConsumption = 0; // median consumption of all resources
  for (const ratio of Object.values(consumptionMod)) {
    const resourceNum = Object.values(consumptionMod).length;
    avgConsumption += resourceNum > 0 ? ratio / resourceNum : 0;
  }

  return avgConsumption;
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
