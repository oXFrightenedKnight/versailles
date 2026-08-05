import { ArmyTraining, newBuilding, roadObject } from "@/lib/types/game";
import { BASE_ROAD_COST, getArmyTrainCost, getNationResource, Road } from "@repo/shared";
import { Building } from "@repo/shared/data/buildings";
import { Hex } from "@repo/shared/data/hex_map";
import { Nation } from "@repo/shared/data/nations";
import { getBuilding, getBuildingConfig } from "@repo/shared/helpers/buildings";
import { getCanceledRoadCostServer } from "./roads";

export function calculateOptimisticGold(
  mapHexes: Hex[],
  buildings: Building[],
  playerNation: Nation | null,
  buildBuildings: newBuilding[],
  serverCancelBuilding: number[], // hexId[]
  buildRoads: roadObject[],
  serverCancelRoadBuilding: string[], // roadId[]
  roads: Road[],
  trainNewArmy: ArmyTraining[]
) {
  let totalCost = 0;

  const hexIdMap = new Map(mapHexes.map((h) => [h.id, h]));

  // add building cost
  for (const building of buildBuildings) {
    const hex = hexIdMap.get(building.hexId);
    if (!hex) continue;

    const existingLevel = hex.buildingId
      ? (getBuilding({ buildings, id: hex.buildingId })?.level ?? 0)
      : 0;

    for (let level = 1; level < building.levelsToUpgrade + 1; level++) {
      const totalLevel = existingLevel + level;

      const config = getBuildingConfig({
        category: building.buildingType,
        level: totalLevel,
      });

      const cost = config ? config.buildCost : 0;
      if (cost) {
        totalCost += cost;
      }
    }
  }

  // return canceled server building cost
  for (const hexId of serverCancelBuilding) {
    const hex = hexIdMap.get(hexId);
    if (!hex) continue;

    const existingLevel = hex.buildingId
      ? (getBuilding({ buildings, id: hex.buildingId })?.level ?? 0)
      : 0;

    if (!hex.build_queue) continue;
    for (let level = 1; level < hex.build_queue.levels + 1; level++) {
      const totalLevel = existingLevel + level;

      const config = getBuildingConfig({
        category: hex.build_queue.building,
        level: totalLevel,
      });

      const cost = config ? config.buildCost : 0;
      if (cost) {
        totalCost -= cost;
      }
    }
  }

  // add road cost
  for (const road of buildRoads) {
    for (let i = 0; i < road.points.length; i++) {
      totalCost += BASE_ROAD_COST;
    }
  }

  // return canceled road cost
  const canceledServerRoadCost = getCanceledRoadCostServer(serverCancelRoadBuilding, roads);
  totalCost -= canceledServerRoadCost;

  // add training cost
  const totalTrainCost = trainNewArmy.reduce((acc, a) => acc + getArmyTrainCost(a.amount), 0);
  totalCost += totalTrainCost;

  const playerGold = playerNation ? getNationResource(playerNation, "gold") : 0;

  return playerGold !== undefined ? playerGold - totalCost : 0;
}

export function hasEnoughGold(effectiveGold: number, cost: number) {
  return effectiveGold >= cost;
}
