import { newBuildings } from "#services/genNations.js";
import { getHexById } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import {
  ActionOfType,
  Building,
  building_categoires,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  getBuilding,
  getBuildingName,
  getHexIdMap,
  Hex,
  Nation,
  topLevelsByCategory,
} from "@repo/shared";
import { ValidationResult, ValidBuildIntentData } from "./types";
import { adjustNationResource, trySpendNationResource } from "#services/resources/production.js";

// Function is used to execute player intent to build new building (subtracts gold)
export function BuildBuilding({
  ctx,
  hexId,
  category,
  levels,
}: {
  ctx: GameCtx;
  hexId: number;
  category: BUILDINGS_CATEGORY;
  levels?: number;
}) {
  const hex = getHexById(hexId, ctx);
  if (!hex) return;

  const existing = hex.buildingId
    ? getBuilding({ buildings: ctx.buildings, id: hex.buildingId })
    : null;
  const levelsToUpgrade = levels ?? 1;

  if (existing) {
    existing.level += levelsToUpgrade;
  } else {
    const id = crypto.randomUUID();
    ctx.buildings.push({
      id,
      category,
      level: levelsToUpgrade,
      availableResources: {},
      statistics: {
        consumed: [],
        produced: [],
      },
    });
    hex.buildingId = id;
  }
}

export function giveProgressBuilding(ctx: GameCtx) {
  const buildingHexes = ctx.mapHexes.filter((h) => h.build_queue);
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  // add progress
  for (const hex of buildingHexes) {
    if (!hex.build_queue) continue;

    hex.build_queue.progress += 1;

    // IF ENOUGH PROGRESS - BUILD/UPGRADE
    const prevLevel = hex.buildingId ? (buildingIdMap.get(hex.buildingId)?.level ?? 0) : 0;
    const nextBuildingName = getBuildingName(hex.build_queue.building, prevLevel + 1);

    if (!nextBuildingName) continue;

    // Check if progress equals to build time
    if (hex.build_queue.progress >= BUILDINGS[nextBuildingName].buildTime) {
      BuildBuilding({
        ctx,
        hexId: hex.id,
        category: hex.build_queue.building,
      });

      hex.build_queue.progress = 0;
      hex.build_queue.levels -= 1;
      if (hex.build_queue.levels <= 0) {
        hex.build_queue = null;
      }
    }
  }
}

export function buildNewIntentBuildings(
  ctx: GameCtx,
  nation: Nation,
  newBuildings: ActionOfType<"building.build">[]
) {
  const hexIdMap = getHexIdMap(ctx);
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  const successfulIds = new Set<number>();
  for (const intent of newBuildings) {
    const result = validateBuildIntent(ctx, nation, intent, hexIdMap, buildingIdMap, successfulIds);
    if (!result.ok) {
      console.warn(`${result.issue}`);
      continue;
    }

    const data = result.data;

    // --- SUBTRACT GOLD AND BUILD
    const nextBuildingName = getBuildingName(intent.buildingType, data.newTotalLevel);
    if (!nextBuildingName) continue;

    const cost = BUILDINGS[nextBuildingName].buildCost;
    if (trySpendNationResource(nation, "gold", cost)) {
      const currentProgress = data.hex.build_queue ? data.hex.build_queue.progress : 0;
      data.hex.build_queue = {
        building: intent.buildingType,
        progress: currentProgress,
        owner: data.hexOwner,
        levels: data.currentQueuedLevels + intent.levelsToUpgrade,
      };

      successfulIds.add(data.hex.id);
    }
  }
}
function validateBuildIntent(
  ctx: GameCtx,
  nation: Nation,
  intent: ActionOfType<"building.build">,
  hexIdMap: Map<number, Hex>,
  buildingIdMap: Map<string, Building>,
  successfulIds: Set<number>
): ValidationResult<ValidBuildIntentData> {
  // skip if intent's category does not exist
  if (!building_categoires.includes(intent.buildingType)) {
    return {
      ok: false,
      issue: `Invalid building type for hex ${intent.hexId} of ${intent.buildingType} from ${nation.id}`,
    };
  }

  // check if hexId is valid
  const hex = hexIdMap.get(intent.hexId);
  if (!hex) {
    return { ok: false, issue: `HexId of ${intent.hexId} does not exist!` };
  }

  // skip if this hex id already had build intent this turn
  if (successfulIds.has(intent.hexId)) {
    return {
      ok: false,
      issue: `Building of ${intent.buildingType} on hex ${intent.hexId} failed due to duplicate intents on same hex!`,
    };
  }

  // skip if building on non-owned hexes
  if (hex.owner !== nation.id || !hex.owner) {
    return {
      ok: false,
      issue: `Not enough permissions. ${nation.id} trying to build on ${hex.owner}'s hex`,
    };
  }

  // skip if existing building in hex category doesn't match intent category
  const building = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;
  if (building && intent.buildingType !== building.category) {
    return {
      ok: false,
      issue: `Invalid intent building category for hex ${hex.id}. Expected ${building.category}, got ${intent.buildingType}`,
    };
  }

  // skip if category doesn't match already queued building
  if (hex.build_queue && intent.buildingType !== hex.build_queue.building) {
    return {
      ok: false,
      issue: `Invalid intent building category for hex ${hex.id}. Expected ${hex.build_queue.building} from queued, got ${intent.buildingType}`,
    };
  }

  const maxLevel =
    topLevelsByCategory.find((obj) => obj.category === intent.buildingType)?.level ?? 0;
  const currentLevel = building ? building.level : 0;
  const currentQueuedLevels = hex.build_queue ? hex.build_queue.levels : 0;
  const newTotalLevel = currentLevel + currentQueuedLevels + intent.levelsToUpgrade;
  if (newTotalLevel > maxLevel) {
    return {
      ok: false,
      issue: `Error: Building above max level ${maxLevel} in hex ${intent.hexId}`,
    };
  }

  const data = {
    hex,
    building,
    newTotalLevel,
    hexOwner: hex.owner,
    currentQueuedLevels,
  };
  return { ok: true, data };
}
