import {
  AVAILABLE_TILES,
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  BuildingType,
  findBuildingNameByCategory,
  findNeighbors,
  getBuilding,
  hasSegment,
  Hex,
  Nation,
  NATION_NAMES,
  RESOURCES,
  Road,
  topLevelsByCategory,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { getHexById, randomNationColor } from "./map.js";
import { BuildBuilding, UpgradeBuilding } from "./buildings.js";
import { recalculateContractsPaths } from "./contracts.js";

export type newBuildings = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
}[];

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
      gold: 100,
      manpower: 1000, // change to 0 later when you add manpower calc
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
  nation,
  mapHexes,
  newBuildings,
  buildings,
}: {
  nation: Nation;
  mapHexes: Hex[];
  newBuildings: newBuildings;
  buildings: Building[];
}) {
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
  return mapHexes;
}

export function buildNationRoads({
  nation,
  mapHexes,
  buildRoads,
  roads,
  buildings,
}: {
  nation: Nation;
  mapHexes: Hex[];
  buildRoads: Road[];
  roads: Road[];
  buildings: Building[];
}) {
  // create a set of hex coordinates and a map of hex maps
  const hexCoorSet = new Set<string>(mapHexes.map((hex) => `${hex.q},${hex.r}`));

  const hexMap = new Map<string, Hex>();
  for (const hex of mapHexes) {
    hexMap.set(`${hex.q},${hex.r}`, hex);
  }

  // add client built roads to road array
  outer: for (const road of buildRoads) {
    const points = road.points;
    const pointsCoor = points.map((point) => ({ q: point.q, r: point.r }));

    // check if every point is valid
    if (!pointsCoor.every((p) => hexCoorSet.has(`${p.q},${p.r}`)))
      throw new Error("Road coordinates don't match hex coordinates!");

    // apply check to every point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const hexOfPoint = hexMap.get(`${point.q},${point.r}`);
      if (!hexOfPoint) continue outer;
      const prevPoint = points[i - 1];
      const nextPoint = points[i + 1];
      if (!prevPoint && !nextPoint) {
        continue outer; // also prevents roads that only have one point
      }
      const hexOfPrev = prevPoint ? hexMap.get(`${prevPoint.q},${prevPoint.r}`) : undefined;
      const hexOfNext = nextPoint ? hexMap.get(`${nextPoint.q},${nextPoint.r}`) : undefined;
      if (!hexOfPrev && !hexOfNext) continue outer;

      // --- IF ALL POINTS BORDER ---
      const neighbors = findNeighbors(hexOfPoint, mapHexes);

      // check if either previous or next hex is a neighbor of current hexOfPoint
      let hasNeighbour = false;

      if (hexOfPrev) {
        if (neighbors.includes(hexOfPrev)) {
          hasNeighbour = true;
        }
      }
      if (hexOfNext) {
        if (neighbors.includes(hexOfNext)) {
          hasNeighbour = true;
        }
      }

      if (!hasNeighbour) {
        continue outer; // continue if any point of the road is not neighboring anyone
      }

      // --- CHECK OTHER ROADS FOR SAME PATTERN OF TWO POINTS ---
      if (nextPoint) {
        const roadsWithoutCurr = roads.filter((r) => r.id !== road.id);
        for (const r of roadsWithoutCurr) {
          if (hasSegment(r, point, nextPoint)) {
            continue outer;
          }
        }
      }
    }

    // add construction status
    if (!road.constructing) {
      road.constructing = { progress: 0, owner: nation.id };
    }

    // add road to approved roads for building
    roads.push(road);
  }

  // add progress to every road that is currently constructing
  for (const road of roads) {
    if (!road.constructing) continue;
    const points = road.points;
    const currentPoint = points.find((p) => p.isConstructing); // take first constructing
    if (!currentPoint) continue;

    // if current built point does not belong to construction owner - stop building
    const hexOfPoint = hexMap.get(`${currentPoint.q},${currentPoint.r}`);
    if (!hexOfPoint) continue;

    if (!hexOfPoint.owner || (hexOfPoint.owner && hexOfPoint.owner !== road.constructing.owner)) {
      road.constructing = null;
      road.points = road.points.filter((p) => !p.isConstructing); // filter out road parts that were in construction stage
      continue;
    }

    // add progress
    if (!road.constructing) continue;
    road.constructing.progress++;

    if (road.constructing.progress >= 1) {
      currentPoint.isConstructing = false;

      road.constructing.progress = 0;
    }
  }

  // recaulculate contracts
  recalculateContractsPaths({ buildings, roads, mapHexes });

  return roads;
}

export function getNationById(nationId: string) {
  const nations = memoryStore.maps.get("nations") as Nation[];
  if (!nations) return null;

  const nation = nations.find((n) => n.id === nationId);
  if (nation) return nation;
  return null;
}
