import {
  BUILDINGS,
  BUILDINGS_CATEGORY,
  findBuildingNameByCategory,
  getBuilding,
  Hex,
  Nation,
  topLevelsByCategory,
} from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { getNationBuildingCount } from "../../buildings";
import { getNationArmy } from "../../genNations";
import {
  getAllowedArmyWalk,
  getBorderHexes,
  getHexAxialMap,
  getHexIdMap,
  getNationArmyFromHex,
  getNationBorderHexes,
} from "../../map";
import {
  ARMY_WEIGHT,
  BFSResult,
  BUILDING_PRIORITY,
  BUILDING_WEIGHT,
  BuildingsByCategoryAndLevel,
  Constructing,
  EconomyRatio,
  FightingHex,
  Frontline,
  GOLD_WEIGHT,
  NeighborArmy,
  SelfData,
  WorldAnalysis,
  WorldData,
} from "../types/analyze";
import { bfs } from "../algos/bfs";

export function AIWorldAnalysis({
  ctx,
  nationId,
}: {
  ctx: GameCtx;
  nationId: string;
}): WorldAnalysis | null {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return null;

  const worldData: WorldData = {
    nationsAtWar: getNationsAtWar(ctx),
    nationsAtPeace: getNationsAtPeace(ctx),
    neighborArmies: getNeighborArmies(ctx, nation),
    neighbors: getNationNeighbors(ctx, nation),
    neighborEconomyRatio: getNeighborEconomyRatio(ctx, nation),
    currentFrontlines: getFrontlines(ctx, nation),
    currentBorders: getNationBorderHexes(ctx, nation.id), // hexes of this nation that border others
    borderingHexes: getBorderingHexesData(ctx, nation), // hexes that this nation borders
    fightingHexes: getFightingHexes(ctx, nation),
  };
  const selfData: SelfData = {
    ownedHexCount: getNationHexCount(ctx, nation),
    totalArmy: getNationArmy(ctx, nation.id) ?? 0,
    trainingArmy: getTrainingNationArmy(ctx, nation),
    armyInHexes: getNationArmyInHexes(ctx, nation),
    buildingCounts: getNationBuildingCount(ctx, nation.id),
    constructing: getConstructing(ctx, nation),
    borderBFS: getBorderBFS(ctx, nation),
  };

  const worldAnalysis: WorldAnalysis = { worldData, selfData };
  return worldAnalysis;
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
function getNeighborEconomyRatio(ctx: GameCtx, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const neighbors = getNationNeighbors(ctx, nation);

  const neighborPower: EconomyRatio[] = [];

  function calcPower(nationId: string) {
    const nation = nationIdMap.get(nationId);
    if (!nation) return 1; // minimum viable power

    const gold = nation.gold;
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
function getEconomicPower(gold: number, buildings: BuildingsByCategoryAndLevel) {
  const goldPower = gold * GOLD_WEIGHT;

  let buildingPower = 0;
  for (const [category, counts] of Object.entries(buildings)) {
    for (const levelsObj of counts) {
      const name = findBuildingNameByCategory({
        buildingCategory: category as BUILDINGS_CATEGORY,
        level: levelsObj.level,
      });

      buildingPower += BUILDINGS[name].buildCost * BUILDING_WEIGHT * levelsObj.amount;
    }
  }

  return goldPower + buildingPower;
}

function getNeighborArmies(ctx: GameCtx, nation: Nation): NeighborArmy[] {
  const neighbors = getNationNeighbors(ctx, nation);

  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const neighborArmies: NeighborArmy[] = [];
  for (const id of neighbors) {
    const neighbor = nationIdMap.get(id);
    if (!neighbor) continue;

    const army = getNationArmy(ctx, neighbor.id) ?? 0;
    neighborArmies.push({ nationId: neighbor.id, army });
  }

  return neighborArmies;
}

export function getNationNeighbors(ctx: GameCtx, nation: Nation) {
  const borderHexes = getBorderHexes(ctx, nation.id) ?? [];
  const neighbors = new Set<string>(borderHexes.filter((h) => !h.owner).map((h) => h.owner!));

  return [...neighbors];
}

function getFrontlines(ctx: GameCtx, nation: Nation) {
  const nationIdsAtWar = new Set(nation.atWar);

  const frontlines: Frontline[] = [];

  for (const enemyId of nationIdsAtWar) {
    const borderingNation = getBorderHexes(ctx, enemyId) ?? [];
    const enemyBorderHexes = borderingNation.filter((hex) => hex.owner === nation.id);
    if (enemyBorderHexes.length < 1) continue;
    frontlines.push({
      nationId: enemyId,
      hexIds: enemyBorderHexes.map((h) => h.id),
    });
  }
  return frontlines;
}
function getBorderingHexesData(ctx: GameCtx, nation: Nation) {
  return getBorderHexes(ctx, nation.id) ?? [];
}

function getFightingHexes(ctx: GameCtx, nation: Nation) {
  const nationsAtWar = new Set(nation.atWar);
  const fightingHexes: FightingHex[] = [];
  for (const hex of ctx.mapHexes) {
    if (
      hex.army.some((a) => nationsAtWar.has(a.nationId)) &&
      hex.army.some((a) => a.nationId === nation.id)
    ) {
      const ownArmy = hex.army.find((a) => a.nationId === nation.id)?.amount ?? 0;
      const enemyArmy = hex.army.reduce((acc, obj) => {
        return nationsAtWar.has(obj.nationId) ? acc + obj.amount : acc;
      }, 0);
      const hexPriority = getHexPriority(ctx, hex);
      fightingHexes.push({ hexId: hex.id, ownArmy, enemyArmy, hexPriority });
    }
  }

  return fightingHexes;
}
export function getHexPriority(ctx: GameCtx, hex: Hex) {
  let hexImportance = 0;

  function updateImportance(newValue: number) {
    hexImportance = Math.round(Math.max(hexImportance + newValue, 0));
  }

  if (hex.buildingId) {
    const building = getBuilding({ buildings: ctx.buildings, id: hex.buildingId });
    if (building && building.level) {
      const topCategoryLevel =
        topLevelsByCategory.find((t) => t.category === building.category)?.level ?? 1;
      const score = Math.min(
        1,
        (building.level / Math.max(1, topCategoryLevel)) * BUILDING_PRIORITY[building.category]
      );

      updateImportance(score);
    }
  }

  return hexImportance;
}

// --- SELF-DATA ---
function getNationHexCount(ctx: GameCtx, nation: Nation) {
  return ctx.mapHexes.filter((h) => h.owner === nation.id).length;
}
function getTrainingNationArmy(ctx: GameCtx, nation: Nation) {
  const nationBuildingIds = new Set(
    ctx.mapHexes.filter((h) => h.buildingId && h.owner === nation.id).map((h) => h.buildingId!)
  );

  return ctx.buildings
    .filter((b) => b.category === "BARRACK" && nationBuildingIds.has(b.id))
    .map((b) => ({
      barrackId: b.id,
      amount:
        b.trainingTroops?.reduce((acc, t) => {
          return acc + t.amount;
        }, 0) ?? 0,
    }));
}
function getNationArmyInHexes(ctx: GameCtx, nation: Nation) {
  return ctx.mapHexes
    .filter((h) => h.owner === nation.id && h.army.some((obj) => obj.nationId === nation.id))
    .map((h) => ({ hexId: h.id, amount: getNationArmyFromHex(h, nation.id) })); // CHANGE THAT AND MERGE IN ONE
  // FUNCTION WHERE YOU SEND ALL HEXES TO CHECK AND GET TOTAL AMOUNT
}
function getConstructing(ctx: GameCtx, nation: Nation): Constructing[] {
  return ctx.mapHexes
    .filter((h) => h.build_queue && h.owner === nation.id)
    .map((h) => ({
      hexId: h.id,
      category: h.build_queue!.building,
      levels: h.build_queue!.levels,
      progress: h.build_queue!.progress,
    }));
}
function getBorderBFS(ctx: GameCtx, nation: Nation): BFSResult[] {
  const borderHexes = getNationBorderHexes(ctx, nation.id);
  if (!borderHexes) return [];

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  // allowed hexes to walk in
  const allowedWalk = getAllowedArmyWalk(ctx, nation);

  const borderBFS: BFSResult[] = [];
  for (const borderObj of borderHexes) {
    const cameFrom = bfs({
      ctx,
      startHexId: borderObj.hexId,
      hexIdMap,
      axialMap,
      allowedHexIds: allowedWalk,
    });

    borderBFS.push({ startHexId: borderObj.hexId, cameFrom });
  }

  return borderBFS;
}
