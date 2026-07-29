import { calculatePopulationChange } from "#services/map.js";
import { calculateResourceOutput } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import { Building } from "@repo/shared";
import { calculateConsumption, calculateAverageConsumption } from "../consumption";
import { addProductionStat } from "../production";

export function calculateCivilian(building: Building, gameCtx: GameCtx) {
  const { mapHexes, nations } = gameCtx;

  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);

  const goldProduced = calculateResourceOutput(hex, "gold", avgConsumption);

  // add gold to nation
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  nation.gold += goldProduced;
  addProductionStat(building, "gold", goldProduced);
}
