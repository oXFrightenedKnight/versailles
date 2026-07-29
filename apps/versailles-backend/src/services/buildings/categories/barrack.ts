import { calculatePopulationChange } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Building, BUILDINGS, baseTrainingProgress, getBuildingName } from "@repo/shared";
import { calculateAverageConsumption, calculateConsumption } from "../consumption";
import { trainArmyProgress } from "#services/army/training.js";

export function calculateBarracks(building: Building, gameCtx: GameCtx) {
  const { mapHexes, nations } = gameCtx;

  // apply resource consumption
  const name = getBuildingName(building.category, building.level);
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const totalEfficiency = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, totalEfficiency);
  // don't forget to re-calculate population change in hex after finding amount of trained army this turn
  // or when deploying army

  // add progress to existing troops in training
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  // filter out any training army that does not belong to owner of hex
  const filtered = building.trainingTroops?.filter((t) => t.nationId === hex.owner);
  building.trainingTroops = filtered;

  trainArmyProgress(gameCtx, building.id, hex.id, totalEfficiency);
}
