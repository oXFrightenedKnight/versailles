import {
  AVAILABLE_TILES,
  Building,
  building_categoires,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  findBuildingNameByCategory,
  getBuilding,
  Nation,
  NATION_NAMES,
  ServerContractUpdate,
  topLevelsByCategory,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { GameCtx, IntentInput } from "../trpc/index.js";
import { cancelArmyTraining, declareWar, moveArmy, queueArmyTraining } from "./army.js";
import { BuildBuilding, cancelBuilding, deleteBuilding, UpgradeBuilding } from "./buildings.js";
import { createContracts, deleteContracts, newContract, updateContracts } from "./contracts.js";
import { getHexById, randomNationColor } from "./map.js";
import { buildNationRoads, cancelRoadBuild } from "./road.js";
import { executeMailsAnswers } from "./mails.js";

export type newBuildings = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
}[];

// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
export function generateNations({ buildings }: { buildings: Building[] }) {
  // choose nations and assign available spaces
  let availableTiles = [...AVAILABLE_TILES];
  let availableNations = Object.values(NATION_NAMES);
  const nations: Nation[] = [];

  for (let i = 0; i < 6; i++) {
    const randomIdx = Math.floor(1 + Math.random() * availableNations.length) - 1;
    const randomTileIdx = Math.floor(1 + Math.random() * availableTiles.length) - 1;
    const agression = Math.random();
    const expansionBias = Math.random();

    const nationIdx = availableNations[randomIdx];
    availableNations.splice(randomIdx, 1);
    const tileIdx = availableTiles[randomTileIdx];
    availableTiles.splice(randomTileIdx, 1);
    nations.push({
      id: nationIdx,
      capitalTileIdx: tileIdx,
      color: randomNationColor(),
      aggression: agression,
      expansionBias: expansionBias,
      isPlayer: false,
      atWar: [],
      gold: 0,
      manpower: 0,
    });
  }

  // assign player to one of the nations (for now)
  const randomPlayer = Math.floor(1 + Math.random() * nations.length) - 1;
  nations[randomPlayer].isPlayer = true;

  // every country starts with a village (capital)
  for (const nation of nations) {
    if (AVAILABLE_TILES.includes(nation.capitalTileIdx)) {
      const tile = getHexById(nation.capitalTileIdx);
      if (tile) {
        tile.owner = nation.id;

        BuildBuilding({ category: "CIVILIAN", buildings, hex: tile, level: 2 });

        const randomPopulation = 750 + Math.floor(1 + Math.random() * 200);

        tile.population = randomPopulation;
        tile.army.push({ amount: 100, nationId: nation.id });
      } else continue;
    }
  }

  return nations;
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

export function executeIntents(ctx: GameCtx, nation: Nation, intentCtx: IntentInput) {
  const roadsToBuild = intentCtx.buildRoads.map((r) => ({
    ...r,
    points: r.points.map((p) => ({
      ...p,
      isConstructing: true,
    })),
    constructing: null,
  }));

  // 1. Cancel Army Training
  cancelArmyTraining(ctx, intentCtx.deleteArmyTrain, nation);
  // 2. delete contracts
  deleteContracts(ctx, intentCtx.deleteContracts, nation);
  // 3. cancel building
  cancelBuilding(ctx, intentCtx.buildingCancel, nation);
  // 4. cancel road building
  cancelRoadBuild(ctx, intentCtx.cancelRoadBuild, nation);
  // 5. delete buildings
  deleteBuilding(ctx, intentCtx.buildingDelete, nation);

  // 6. update contracts
  updateContracts(ctx, intentCtx.updateContracts as ServerContractUpdate[], nation);

  // 7. Resolve answered mails
  executeMailsAnswers(ctx, intentCtx.answeredMails, nation);
  // 8. declare wars on others
  declareWar(ctx, intentCtx.declareWar, nation);

  // 9. queue buildings
  buildNationBuildings({
    gameCtx: ctx,
    newBuildings: intentCtx.newQueuedBuildings as newBuildings,
    nation,
  });
  // 10. queue roads
  buildNationRoads({ gameCtx: ctx, buildRoads: roadsToBuild, nationId: nation.id });
  // 11. queue army training
  queueArmyTraining({ trainNewArmy: intentCtx.trainNewArmy, nationId: nation.id, gameCtx: ctx });

  // 12. move nation army
  for (const hexObj of intentCtx.movePlayerArmy) {
    moveArmy({
      hexId: hexObj.hexId,
      amount: hexObj.amount,
      direction: hexObj.direction,
      nationId: nation.id,
      gameCtx: ctx,
    });
  }
  // 13. create new contracts
  createContracts({
    contracts: intentCtx.createNewContracts as newContract[],
    gameCtx: ctx,
    nation,
  });
}

export function runIntentForEachNation(
  ctx: GameCtx,
  intentCtx: { input: IntentInput; nationId: string }[]
) {
  const nationMap = new Map(ctx.nations.map((n) => [n.id, n]));

  for (const intentObj of intentCtx) {
    const nation = nationMap.get(intentObj.nationId);
    if (!nation) continue;

    executeIntents(ctx, nation, intentObj.input);
  }
}
