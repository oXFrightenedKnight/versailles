import {
  BASE_CAPITAL_WHEAT,
  BASE_HEX_POPULATION,
  baseTrainingProgress,
  Building,
  building_categoires,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  estimateConsumption,
  findBuildingNameByCategory,
  getBuilding,
  Hex,
  Nation,
  ResourceRates,
  RESOURCES,
  topLevelsByCategory,
} from "@repo/shared";
import { roundToNearestDecimal } from "../lib/helpers.js";
import { GameCtx } from "../trpc/index.js";
import { calculatePopulationChange, getHexById, getHexIdMap } from "./map.js";
import { newBuildings, subtractGold } from "./genNations.js";
import { BuildingsByCategoryAndLevel } from "./ai/types/analyze.js";
import { ValidationResult, ValidBuildIntentData } from "./types.js";
import { getBuildingsByIdMap } from "./ai/decision/helpers.js";

export function buildingOutput(gameCtx: GameCtx) {
  const { buildings } = gameCtx;
  // sort buildings into different groups
  const civilian = buildings.filter((b) => b.category === "CIVILIAN");
  const farms = buildings.filter((b) => b.category === "FARM");
  const barracks = buildings.filter((b) => b.category === "BARRACK");
  const woodcamps = buildings.filter((b) => b.category === "WOODCAMP");
  const watchtowers = buildings.filter((b) => b.category === "WATCHTOWER");

  // calculate output for every building (farms and)
  for (const civ of civilian) {
    calculateCivilian(civ, gameCtx);
  }
  for (const farm of farms) {
    calculateFarm(farm, gameCtx);
  }
  for (const barrack of barracks) {
    calculateBarracks(barrack, gameCtx);
  }
  for (const woodcamp of woodcamps) {
    calculateWoodcamp(woodcamp, gameCtx);
  }
  for (const tower of watchtowers) {
    calculateWatchtower(tower, gameCtx);
  }
}

function calculateFarm(building: Building, gameCtx: GameCtx) {
  const { mapHexes } = gameCtx;

  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, 1); // 1 means 100% consumption (since farm does not consume anything)

  // now calculate wheat output
  const wheatProduced = calculateResourceOutput(hex, "wheat");
  addResourceToStorage(building, "wheat", wheatProduced);
}

function calculateCivilian(building: Building, gameCtx: GameCtx) {
  const { mapHexes, nations } = gameCtx;

  // give base 10 wheat to capitals to allow self sustain
  calculateCapitalWheat(gameCtx, building);

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

function calculateBarracks(building: Building, gameCtx: GameCtx) {
  const { mapHexes, nations } = gameCtx;

  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);
  // don't forget to re-calculate population change in hex after finding amount of trained army this turn
  // or when deploying army

  // add progress to existing troops in training
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  // filter out any training army that does not belong to owner of hex
  const filtered = building.trainingTroops?.filter((t) => t.nationId === hex.owner);
  building.trainingTroops = filtered;

  const training = building.trainingTroops;
  const maxTraining = BUILDINGS[name].maxTraining ?? 0;
  let trainingCap = 0; // add progress to every training contract until reached cap
  const idxsToDelete: number[] = [];
  if (training && training.length > 0) {
    for (const [i, army] of training.entries()) {
      if (trainingCap >= maxTraining) continue;

      const amountTrained = Math.min(army.amount, maxTraining - trainingCap);
      const progress = Math.round(baseTrainingProgress * amountTrained * avgConsumption);

      army.progress += progress;
      trainingCap += amountTrained;

      // if progress is full, deploy army
      if (army.progress >= army.amount) {
        const ownerArmyInHex = hex.army.find((a) => a.nationId === army.nationId);
        if (!ownerArmyInHex) {
          hex.army.push({ amount: army.amount, nationId: army.nationId });
        } else {
          ownerArmyInHex.amount += army.amount;
        }

        // add index to delete after loop
        idxsToDelete.push(i);
      }
    }

    // delete armies that finished training and deployed
    building.trainingTroops = training.filter((_, i) => !idxsToDelete.includes(i));
  }
}

function calculateWoodcamp(building: Building, gameCtx: GameCtx) {
  const { mapHexes } = gameCtx;

  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;

  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);

  const woodProduced = calculateResourceOutput(hex, "wood", avgConsumption);
  addResourceToStorage(building, "wood", woodProduced);
}

function calculateWatchtower(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings } = gameCtx;

  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);
}

// Function is used to execute player intent to build new building (subtracts gold)
// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
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
  const currentLevel = existing?.level ?? 0;
  const nextBuilding = findBuildingNameByCategory({
    buildingCategory: category, // hex.build_queue.category
    level: currentLevel + levelsToUpgrade,
  });

  const buildingStorage = [];

  // add dynamic storage
  for (const type of Object.keys(BUILDINGS[nextBuilding].storageCap)) {
    buildingStorage.push({ type: type as RESOURCES, amount: 0 });
  }

  if (existing) {
    existing.level += levelsToUpgrade;
    existing.storage = buildingStorage;
  } else {
    const id = crypto.randomUUID();
    ctx.buildings.push({
      id,
      category,
      level: levelsToUpgrade,
      storage: buildingStorage,
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
    const nextBuilding = findBuildingNameByCategory({
      buildingCategory: hex.build_queue.building,
      level: prevLevel + 1,
    });

    // Check if progress equals to build time
    if (hex.build_queue.progress >= BUILDINGS[nextBuilding].buildTime) {
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

export function buildNewIntentBuildings({
  gameCtx,
  newBuildings,
  nation,
}: {
  gameCtx: GameCtx;
  newBuildings: newBuildings;
  nation: Nation;
}) {
  const hexIdMap = getHexIdMap(gameCtx);
  const buildingIdMap = new Map(gameCtx.buildings.map((b) => [b.id, b]));

  const successfulIds = new Set<number>();
  for (const intent of newBuildings) {
    const result = validateBuildIntent(
      gameCtx,
      nation,
      intent,
      hexIdMap,
      buildingIdMap,
      successfulIds
    );
    if (!result.ok) {
      console.warn(`${result.issue}`);
      continue;
    }

    const data = result.data;

    // --- SUBTRACT GOLD AND BUILD
    const nextBuilding = findBuildingNameByCategory({
      buildingCategory: intent.buildingType,
      level: data.newTotalLevel,
    });
    const cost = BUILDINGS[nextBuilding].buildCost;
    if (subtractGold(gameCtx, nation.id, cost)) {
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
  intent: newBuildings[number],
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

export function calculateConsumption({
  building,
  gameCtx,
}: {
  building: Building;
  gameCtx: GameCtx;
}) {
  const { mapHexes } = gameCtx;

  // this function calculates and applies consumption, returning the consumed ratio
  // later we use that ratio to multiply our output.

  const storage = building.storage;

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });

  const consuming = Object.keys(BUILDINGS[name].consumptionMod) as RESOURCES[];
  const estConsumption = estimateConsumption({ building, mapHexes });
  if (!estConsumption || !name || !storage) {
    return {};
  }

  let estConsumptionRatio = new Map<string, number>();
  for (const resource of consuming) {
    const currStoredResource = storage.find((s) => s.type === resource);
    if (!currStoredResource) continue;
    // don't add a resource if it can't be stored and doesn't have a maximum cap
    const storageCap = BUILDINGS[name].storageCap[resource];
    if (!storageCap || storageCap === 0) continue;

    // consume resource
    const left = Math.round(
      Math.max(currStoredResource.amount - (estConsumption[resource] ?? 0), 0)
    );
    const consumed = Math.max(currStoredResource.amount - left, 0); // just in case

    addConsumptionStat(building, resource, consumed);
    console.log("consumed this turn", consumed);

    currStoredResource.amount = left;

    const need = estConsumption[resource] ?? 0;

    const ratio = need > 0 ? consumed / need : 1;
    estConsumptionRatio.set(
      resource,
      roundToNearestDecimal(ratio, 100) // to hundredth
    );
  }

  return Object.fromEntries(estConsumptionRatio);
}

function calculateAverageConsumption(consumptionMod: Record<string, number>) {
  let avgConsumption = 0; // median consumption of all resources
  for (const ratio of Object.values(consumptionMod)) {
    const resourceNum = Object.values(consumptionMod).length;
    avgConsumption += resourceNum > 0 ? ratio / resourceNum : 0;
  }

  return avgConsumption;
}

export function cancelBuilding(ctx: GameCtx, hexIds: number[], nation: Nation) {
  const hexIdMap = new Map(ctx.mapHexes.filter((h) => h.build_queue).map((h) => [h.id, h]));
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  for (const id of hexIds) {
    const hex = hexIdMap.get(id);
    if (!hex || !hex.build_queue) continue;
    if (hex.owner !== nation.id) continue;

    // return cost
    const existing = hex.buildingId ? buildingIdMap.get(hex.buildingId) : null;
    for (let level = 1; level < hex.build_queue.levels + 1; level++) {
      const totalLevel = existing ? level + existing.level : level;

      const name = findBuildingNameByCategory({
        buildingCategory: hex.build_queue.building,
        level: totalLevel,
      });
      const cost = BUILDINGS[name].buildCost;
      nation.gold += cost;
    }

    // cancel building
    hex.build_queue = null;
  }
}

// delete buildings by their id
export function deleteBuilding(ctx: GameCtx, deleteIds: string[], nation: Nation) {
  const buildingHexMap = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  for (const id of deleteIds) {
    const building = buildingIdMap.get(id);
    const hex = buildingHexMap.get(id);
    if (!building || !hex) continue;
    if (hex.owner !== nation.id) continue;
    if (nation.capitalTileIdx === hex.id) continue;

    // delete building
    const idx = ctx.buildings.indexOf(building);
    if (idx !== -1) {
      ctx.buildings.splice(idx, 1);
      hex.buildingId = null;
      hex.population = BASE_HEX_POPULATION;
    }
  }
}

export function getBuildingInHex(ctx: GameCtx, hexId: number) {
  const hex = ctx.mapHexes.find((h) => h.id === hexId);

  if (hex?.buildingId) {
    const building = getBuilding({ buildings: ctx.buildings, id: hex.buildingId });
    if (building) return building;
    return null;
  } else {
    return null;
  }
}

// This function is used to allow starting capitals to self sustain themselves
// at the start of the game
function calculateCapitalWheat(ctx: GameCtx, building: Building) {
  const capitalHexIds = new Set(ctx.nations.map((n) => n.capitalTileIdx));
  const capitalHexes = ctx.mapHexes.filter((h) => capitalHexIds.has(h.id));

  const isCapitalBuilding = capitalHexes.some((h) => h.buildingId === building.id);
  if (!isCapitalBuilding) return;

  const storage = building.storage?.find((s) => s.type === "wheat");
  if (!storage) return;

  storage.amount += BASE_CAPITAL_WHEAT;
}

function addConsumptionStat(building: Building, resource: RESOURCES, amount: number) {
  const consumedMap = new Map(building.statistics.consumed.map((c) => [c.resource, c]));

  const objRef = consumedMap.get(resource);
  if (!objRef) {
    building.statistics.consumed.push({ amount, resource });
  } else {
    objRef.amount += amount;
  }
}

function addProductionStat(building: Building, resource: RESOURCES, amount: number) {
  const producedMap = new Map(building.statistics.produced.map((p) => [p.resource, p]));

  const objRef = producedMap.get(resource);
  if (!objRef) {
    building.statistics.produced.push({ amount, resource });
  } else {
    objRef.amount += amount;
  }
}

export function calculateResourceOutput(
  hex: Hex,
  resource: RESOURCES,
  averageConsumption?: number
) {
  if (hex.population === null) return 0;
  const baseResourceRate = ResourceRates[resource];
  return Math.round(hex.population * baseResourceRate * (averageConsumption ?? 1));
}
function addResourceToStorage(building: Building, resource: RESOURCES, amount: number) {
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;

  const max = BUILDINGS[name].storageCap[resource] ?? 0;

  if (building.storage) {
    const storage = building.storage.find((s) => s.type === resource);
    if (!storage) return;

    const newAmount = Math.min(storage.amount + amount, max);
    const added = newAmount - storage.amount;
    storage.amount = newAmount;

    addProductionStat(building, resource, added);
  }
}

export function getNationBuildingCount(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return {};

  const nationBuildHexes = ctx.mapHexes.filter((h) => h.buildingId && h.owner === nationId);

  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));
  const buildCount: BuildingsByCategoryAndLevel = {};

  for (const hex of nationBuildHexes) {
    const building = buildingIdMap.get(hex.buildingId!);
    if (!building) continue;

    const categoryCount = (buildCount[building.category] ??= []);
    const levelObj = categoryCount.find((c) => c.level === building.level);

    if (levelObj) {
      levelObj.amount++;
    } else {
      categoryCount.push({ level: building.level, amount: 1 });
    }
  }

  return buildCount;
}

// this function returns expected building in hex (queued + current)
export function getOptimisticBuildInHex(
  ctx: GameCtx,
  hexId: number,
  hexIdMapProp?: Map<number, Hex>,
  buildingIdMapProp?: Map<string, Building>
) {
  const hexIdMap = hexIdMapProp ?? getHexIdMap(ctx);
  const buildingIdMap = buildingIdMapProp ?? getBuildingsByIdMap(ctx);

  const hex = hexIdMap.get(hexId);
  const queued = hex?.build_queue ?? null;
  const existing = hex?.buildingId ? (buildingIdMap.get(hex.buildingId) ?? null) : null;

  if (!queued && !existing) return null;
  // if both exist but their categories don't match
  if (existing && queued) {
    if (queued.building !== existing.category) return null;
  }

  const category = existing?.category ?? queued?.building ?? null;
  if (!category) return null;

  const level = (existing?.level ?? 0) + (queued?.levels ?? 0);

  return { category, level };
}

export function getNationBuildings(ctx: GameCtx, nation: Nation) {
  const hexBuildingMap = new Map(
    ctx.mapHexes
      .filter((h) => h.owner === nation.id)
      .flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );

  return ctx.buildings.filter((b) => hexBuildingMap.has(b.id));
}
