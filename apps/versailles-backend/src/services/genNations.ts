import {
  AVAILABLE_TILES,
  building_categoires,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  findBuildingNameByCategory,
  getBuilding,
  Nation,
  NATION_NAMES,
  NATION_NUMBER,
  topLevelsByCategory,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { GameCtx } from "../trpc/index.js";
import { addArmy } from "./army.js";
import { BuildBuilding, UpgradeBuilding } from "./buildings.js";
import { getHexById, randomNationColor } from "./map.js";

export type newBuildings = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
}[];

// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
export function generateNations(ctx: GameCtx) {
  // choose nations and assign available spaces
  let availableTiles = [...AVAILABLE_TILES];
  let availableNations = Object.values(NATION_NAMES);

  for (let i = 0; i < NATION_NUMBER; i++) {
    const randomIdx = Math.floor(1 + Math.random() * availableNations.length) - 1;
    const randomTileIdx = Math.floor(1 + Math.random() * availableTiles.length) - 1;
    const agression = Math.random();
    const expansionBias = Math.random();

    const nationIdx = availableNations[randomIdx];
    availableNations.splice(randomIdx, 1);
    const tileIdx = availableTiles[randomTileIdx];
    availableTiles.splice(randomTileIdx, 1);

    createNewNation({ ctx, nationId: nationIdx, capitalId: tileIdx, agression, expansionBias });
  }

  // assign 1 random country to player
  assignRandomPlayer(ctx);

  // every country starts with a village (capital)
  for (const nation of ctx.nations) {
    if (AVAILABLE_TILES.includes(nation.capitalTileIdx)) {
      const tile = getHexById(nation.capitalTileIdx, ctx);
      if (tile) {
        const randomPopulation = 750 + Math.floor(1 + Math.random() * 200);

        tile.owner = nation.id;

        BuildBuilding({ category: "CIVILIAN", buildings: ctx.buildings, hex: tile, level: 2 });
        addPopulation({ ctx, hexId: tile.id, amount: randomPopulation });
        addArmy({ ctx, nationId: nation.id, hexId: tile.id, amount: 100 });
      } else continue;
    }
  }
}

// put new buildings in queue and give progress to older ones
export function buildNationBuildings({
  gameCtx,
  newBuildings,
  nation,
}: {
  gameCtx: GameCtx;
  newBuildings: newBuildings;
  nation: Nation;
}) {
  const { mapHexes, buildings } = gameCtx;

  // check if building types are valid
  if (newBuildings.some((b) => !building_categoires.includes(b.buildingType)))
    throw new Error("Invalid Building Type!");

  // check if hex ids' exist
  const hexIdSet = new Set<number>(mapHexes.map((hex) => hex.id));
  if (!newBuildings.every((obj) => hexIdSet.has(obj.hexId)))
    throw new Error("Hex id doesn't exist!");

  const arr = newBuildings.map((obj) => obj.hexId);
  if (arr.length !== new Set(arr).size)
    throw new Error("Duplicate hex ids in buildings are not allowed!");
  const ownerTiles = mapHexes.filter((hex) => hex.owner === nation.id);
  const buildHexes = mapHexes.filter((hex) => arr.includes(hex.id)); // hexes that we will be queueing build on

  // make building map so that we don't have to O(n^2)
  const buildingMap = new Map(
    newBuildings.map((obj) => [
      obj.hexId,
      { buildingType: obj.buildingType, level: obj.levelsToUpgrade },
    ])
  );

  for (const hex of buildHexes) {
    // skip if no owner or hex doesn't belong to this nation
    if (hex.owner !== nation.id || !hex.owner) continue;

    const buildingObj = buildingMap.get(hex.id); // get building obj from map
    if (!buildingObj) continue;

    const buildingType = buildingObj?.buildingType;
    const queuedLevel = buildingObj?.level;
    const queuedBuilding = findBuildingNameByCategory({
      buildingCategory: buildingType,
      level: queuedLevel,
    });

    if (!queuedBuilding) continue;

    // skip if new building doesn't match already existing building category
    const building = buildings.find((b) => b.id === hex.buildingId);
    if (building && buildingType !== building.category) continue;

    // skip if new building doesn't match already queued building
    if (hex.build_queue && buildingType !== hex.build_queue.building) continue;

    // max possible level
    const maxLevel = topLevelsByCategory.find((obj) => obj.category === buildingType)?.level ?? 0;
    // current already built level
    const currentLevel = building ? building.level : 0;
    // current level in queued object
    const currentQueuedLevels = hex.build_queue ? hex.build_queue.levels : 0;

    if (currentLevel + currentQueuedLevels + queuedLevel > maxLevel) continue;

    const currentProgress = hex.build_queue ? hex.build_queue.progress : 0;

    hex.build_queue = {
      building: buildingType,
      progress: currentProgress,
      owner: hex.owner,
      levels: currentQueuedLevels + queuedLevel,
    }; // queue building
  }

  // give progress to all buildings in queue OF THAT NATION ONLY
  for (const hex of ownerTiles) {
    if (!hex.build_queue) continue;

    hex.build_queue.progress++;
    // find level if there is a finished building in hex
    const prevLevel = hex.buildingId
      ? (getBuilding({ id: hex.buildingId, buildings })?.level ?? 0)
      : 0;
    // next building we will upgrade to
    const building = findBuildingNameByCategory({
      buildingCategory: hex.build_queue.building,
      level: prevLevel + 1,
    });
    if (!building) {
      hex.build_queue = null;
      continue;
    }

    if (hex.build_queue.progress >= BUILDINGS[building].buildTime) {
      if (hex.buildingId) {
        const existing = getBuilding({ id: hex.buildingId, buildings });
        if (existing) {
          UpgradeBuilding({ building: existing });
        }
      } else {
        // if this is first building:
        BuildBuilding({ category: hex.build_queue.building, buildings, hex });
      }

      hex.build_queue.progress = 0;
      hex.build_queue.levels -= 1;

      // assign null if no more buildings left to build
      if (hex.build_queue.levels <= 0) {
        hex.build_queue = null;
      }
    }
  }
}

export function getNationById(nationId: string) {
  const nations = memoryStore.maps.get("nations") as Nation[];
  if (!nations) return null;

  const nation = nations.find((n) => n.id === nationId);
  if (nation) return nation;
  return null;
}

export function createNewNation({
  ctx,
  nationId,
  capitalId,
  agression,
  expansionBias,
  isPlayer,
}: {
  ctx: GameCtx;
  nationId: string;
  capitalId: number;
  agression: number;
  expansionBias: number;
  isPlayer?: boolean;
}) {
  ctx.nations.push({
    id: nationId,
    capitalTileIdx: capitalId,
    color: randomNationColor(),
    aggression: agression,
    expansionBias: expansionBias,
    isPlayer: isPlayer ? isPlayer : false,
    atWar: [],
    atPeace: [],
    gold: 0,
    manpower: 0,
  });
}

export function assignRandomPlayer(ctx: GameCtx) {
  const availableNations = ctx.nations.filter((n) => !n.isPlayer);
  if (availableNations.length === 0) return;

  const randomIndex = Math.floor(Math.random() * availableNations.length);

  const nation = availableNations[randomIndex];

  nation.isPlayer = true;
}

export function addPopulation({
  ctx,
  hexId,
  amount,
}: {
  ctx: GameCtx;
  hexId: number;
  amount: number;
}) {
  const hex = getHexById(hexId, ctx);

  if (!hex) return;
  if (amount <= 0) return;
  if (hex.population === null) return;

  hex.population += amount;
}

export function setDefeated(nation: Nation) {
  // place player logic here later (eg. set playerMode)
  nation.isDefeated = true;
}

export function subtractGold(ctx: GameCtx, nationId: string, amount: number) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return false;

  if (nation.gold >= amount && !(nation.gold < 0)) {
    nation.gold -= amount;
    return true;
  } else {
    return false;
  }
}
