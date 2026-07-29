import { calculatePopulationChange } from "#services/map.js";
import { calculateResourceOutput } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import { Building, getBuildingName } from "@repo/shared";
import { calculateConsumption, calculateAverageConsumption } from "../consumption";
import { addResourceToStorage } from "../storage";

export function calculateWoodcamp(building: Building, gameCtx: GameCtx) {
  const { mapHexes } = gameCtx;

  // apply resource consumption
  const name = getBuildingName(building.category, building.level);
  if (!name) return;

  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);

  const woodProduced = calculateResourceOutput(hex, "wood", avgConsumption);
  addResourceToStorage(building, "wood", woodProduced);
}
