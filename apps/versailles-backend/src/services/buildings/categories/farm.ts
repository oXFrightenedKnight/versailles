import { calculatePopulationChange } from "#services/map.js";
import { calculateResourceOutput } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import { Building } from "@repo/shared";
import { addResourceToStorage } from "../storage";

export function calculateFarm(building: Building, gameCtx: GameCtx) {
  const { mapHexes } = gameCtx;

  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, 1); // 1 means 100% consumption (since farm does not consume anything)

  // now calculate wheat output
  const wheatProduced = calculateResourceOutput(hex, "wheat");
  addResourceToStorage(building, "wheat", wheatProduced);
}
