import { calculatePopulationChange } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Building } from "@repo/shared";
import { calculateConsumption, calculateAverageConsumption } from "../consumption";

export function calculateWatchtower(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings } = gameCtx;

  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);
}
