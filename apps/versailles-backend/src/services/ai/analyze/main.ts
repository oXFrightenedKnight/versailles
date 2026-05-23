import {
  BUILDINGS,
  BUILDINGS_CATEGORY,
  findBuildingNameByCategory,
  findNeighbors,
  HEX_DIRECTIONS,
  Nation,
} from "@repo/shared";
import { GameCtx } from "../../../trpc";
import {
  ARMY_WEIGHT,
  BORDER_ARMY_WEIGHT,
  BUILDING_WEIGHT,
  BuildingsByCategoryAndLevel,
  GOLD_WEIGHT,
  WorldAnalysis,
} from "../types/analyze";
import { getNationArmy } from "../../genNations";
import { getBorderHexes } from "../../map";
import { getNationBuildingCount } from "../../buildings";

export function AIWorldAnalysis({ ctx, nationId }: { ctx: GameCtx; nationId: string }) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return null;

  const worldData = {
    nationsAtWar: getNationsAtWar(ctx),
    nationsAtPeace: getNationsAtPeace(ctx),
  };
  return {} as WorldAnalysis;
}

function getNationsAtWar(ctx: GameCtx) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const atWar = new Map<string, { nationId1: string; nationId2: string }>();

  for (const nation of ctx.nations) {
    for (const enemyId of nation.atWar) {
      const enemy = nationIdMap.get(enemyId);
      if (!enemy) continue;

      if (atWar.has(`${enemyId},${nation.id}`)) continue;
      atWar.set(`${nation.id},${enemyId}`, { nationId1: nation.id, nationId2: enemyId });
    }
  }

  return [...atWar.values()];
}
function getNationsAtPeace(ctx: GameCtx) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const atPeace = new Map<string, { nationId1: string; nationId2: string; turnsLeft: number }>();

  for (const nation of ctx.nations) {
    for (const obj of nation.atPeace) {
      const peaceNation = nationIdMap.get(obj.nationId);
      if (!peaceNation) continue;

      if (atPeace.has(`${peaceNation.id},${nation.id}`)) continue;
      atPeace.set(`${nation.id},${peaceNation.id}`, {
        nationId1: nation.id,
        nationId2: peaceNation.id,
        turnsLeft: obj.turnsRemaining,
      });
    }
  }

  return [...atPeace.values()];
}
function getNeighborStrength(ctx: GameCtx, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const borderHexes = getBorderHexes(ctx, nation.id) ?? [];
  const neighbors = new Set<string>(borderHexes.filter((h) => !h.owner).map((h) => h.owner!));

  for (const neighborId of neighbors) {
    const neighbor = nationIdMap.get(neighborId);
    if (!neighbor) continue;

    // all hexes that neighbor has bordering with this nation
    const neighborBorderHexes = borderHexes.filter((h) => h.owner === neighborId);

    const army = getNationArmy(ctx, neighbor.id) ?? 0;
    const armyAtBorder = getNationArmy(
      ctx,
      neighbor.id,
      neighborBorderHexes.map((h) => h.id)
    );
    const gold = neighbor.gold;
    const buildings = getNationBuildingCount(ctx, neighbor.id);

    //const power = getPower(army, armyAtBorder, gold, buildings);
  }
}
function getPower(
  army: number,
  borderArmy: number,
  gold: number,
  buildings: BuildingsByCategoryAndLevel
) {
  const armyPower = army * ARMY_WEIGHT;
  const borderArmyPower = borderArmy * BORDER_ARMY_WEIGHT;
  const goldPower = gold * GOLD_WEIGHT;

  let buildingPower = 0;
  for (const [category, levels] of Object.entries(buildings)) {
    for (const [level, amount] of Object.entries(levels)) {
      const name = findBuildingNameByCategory({
        buildingCategory: category as BUILDINGS_CATEGORY,
        level: Number(level),
      });

      buildingPower += BUILDINGS[name].buildCost * BUILDING_WEIGHT;
    }
  }

  return armyPower + borderArmyPower + goldPower + buildingPower;
}
