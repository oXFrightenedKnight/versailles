import { GameCtx } from "#trpc";
import { Hex } from "@repo/shared";
import { getBuilding, getBuildingName, BUILDINGS } from "@repo/shared/buildings";
import { BIOME_GROWTH } from "@repo/shared/map";

export function calculatePopulationChange(hex: Hex, gameCtx: GameCtx, consumeMod: number) {
  const { buildings } = gameCtx;

  if (!hex.owner || !hex.buildingId) return;
  const building = getBuilding({ buildings, id: hex.buildingId });
  if (!building) return;
  const buildingName = getBuildingName(building.category, building.level);
  const cap =
    BUILDINGS[buildingName || "nomadic_camp"].popCap * BIOME_GROWTH[hex.biome || "plains"];
  const rate = 0.15 * BIOME_GROWTH[hex.biome || "plains"];

  let currPopulation = hex.population || 0;

  const baseGrowth = (cap - currPopulation) * rate;
  let tailGrowth = 0;
  let minimalGrowth = 0;
  if (currPopulation > cap) {
    const excess = currPopulation - cap;
    tailGrowth = cap * 0.0025 * Math.exp(-excess / 1000);
  } else {
    const left = cap - currPopulation;
    minimalGrowth = cap * 0.0025 * Math.exp(-left / 1000);
  }

  const growth = Math.max(minimalGrowth, baseGrowth) + Math.max(0, tailGrowth);

  currPopulation += growth * consumeMod;
  hex.population = Math.round(currPopulation);
}
