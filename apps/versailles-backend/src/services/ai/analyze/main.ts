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
import { getBorderHexes, getNationArmyFromHex } from "../../map";
import {
  ARMY_WEIGHT,
  BUILDING_PRIORITY,
  BUILDING_WEIGHT,
  BuildingsByCategoryAndLevel,
  Constructing,
  FightingHex,
  Frontline,
  GOLD_WEIGHT,
  SelfData,
  StrengthRatio,
  WorldAnalysis,
  WorldData,
} from "../types/analyze";

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
    neighborStrength: getNeighborStrength(ctx, nation),
    currentFrontlines: getFrontlines(ctx, nation),
    borderingHexes: getBorderingHexesData(ctx, nation),
    fightingHexes: getFightingHexes(ctx, nation),
  };
  const selfData: SelfData = {
    ownedHexCount: getNationHexCount(ctx, nation),
    totalArmy: getNationArmy(ctx, nation.id) ?? 0,
    trainingArmy: getTrainingNationArmy(ctx, nation),
    armyInHexes: getNationArmyInHexes(ctx, nation),
    buildingCounts: getNationBuildingCount(ctx, nation.id),
    constructing: getConstructing(ctx, nation),
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
function getNeighborStrength(ctx: GameCtx, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const borderHexes = getBorderHexes(ctx, nation.id) ?? [];
  const neighbors = new Set<string>(borderHexes.filter((h) => !h.owner).map((h) => h.owner!));

  const neighborPower: StrengthRatio[] = [];

  function calcPower(nationId: string) {
    const nation = nationIdMap.get(nationId);
    if (!nation) return 1; // minimum viable power

    const army = getNationArmy(ctx, nation.id) ?? 0;
    const gold = nation.gold;
    const buildings = getNationBuildingCount(ctx, nation.id);

    const power = getPower(army, gold, buildings);
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
function getPower(army: number, gold: number, buildings: BuildingsByCategoryAndLevel) {
  const armyPower = army * ARMY_WEIGHT;
  const goldPower = gold * GOLD_WEIGHT;

  let buildingPower = 0;
  for (const [category, levels] of Object.entries(buildings)) {
    for (const [level, amount] of Object.entries(levels)) {
      const name = findBuildingNameByCategory({
        buildingCategory: category as BUILDINGS_CATEGORY,
        level: Number(level),
      });

      buildingPower += BUILDINGS[name].buildCost * BUILDING_WEIGHT * amount;
    }
  }

  return armyPower + goldPower + buildingPower;
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
      fightingHexes.push({ id: hex.id, ownArmy, enemyArmy, hexPriority });
    }
  }

  return fightingHexes;
}
function getHexPriority(ctx: GameCtx, hex: Hex) {
  let hexImportance = 0;

  function updateImportance(newValue: number) {
    hexImportance = Math.round(Math.max(newValue, 0));
  }

  if (hex.buildingId) {
    const building = getBuilding({ buildings: ctx.buildings, id: hex.buildingId });
    if (building && building.level) {
      const topCategoryLevel =
        topLevelsByCategory.find((t) => t.category === building.category)?.level ?? 1;
      const score =
        (building.level / Math.max(1, topCategoryLevel)) *
        BUILDING_PRIORITY[building.category] *
        100;

      updateImportance(hexImportance + score);
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
