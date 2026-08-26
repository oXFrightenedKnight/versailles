import { GOLD_WEIGHT, BUILDING_WEIGHT } from "#simulation/ai/analysis/policy";
import { EconomyRatio } from "#simulation/ai/analysis/types";
import { getNationNeighbors } from "#simulation/ai/world/nations";
import { getNationBuildingCount } from "#simulation/buildings/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import {
  BuildingsByCategoryAndLevel,
  getBuildingConfig,
  BUILDINGS_CATEGORY,
} from "@repo/shared/buildings";
import { getNationResource } from "@repo/shared/resources";

export function getNeighborEconomyRatio(ctx: GameCtx, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const neighbors = getNationNeighbors(ctx, nation);

  const neighborPower: EconomyRatio[] = [];

  function calcPower(nationId: string) {
    const nation = nationIdMap.get(nationId);
    if (!nation) return 1; // minimum viable power

    const gold = getNationResource(nation, "gold");
    const buildings = getNationBuildingCount(ctx, nation.id);

    const power = getEconomicPower(gold, buildings);
    return power;
  }

  const nationPower = calcPower(nation.id);
  // get each neighbor power
  for (const neighborId of neighbors) {
    const power = calcPower(neighborId);
    const ratio = Math.round((Math.max(1, power) / Math.max(1, nationPower)) * 100) / 100;
    neighborPower.push({ nationId: neighborId, ratio });
  }
  return neighborPower;
}
export function getEconomicPower(gold: number, buildings: BuildingsByCategoryAndLevel) {
  const goldPower = gold * GOLD_WEIGHT;

  let buildingPower = 0;
  for (const [category, counts] of Object.entries(buildings)) {
    for (const levelsObj of counts) {
      const config = getBuildingConfig({
        category: category as BUILDINGS_CATEGORY,
        level: levelsObj.level,
      });
      if (!config) continue;

      buildingPower += config.buildCost * BUILDING_WEIGHT * levelsObj.amount;
    }
  }

  return goldPower + buildingPower;
}
