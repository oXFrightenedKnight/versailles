export function cubeDistance(a: CubeCoord, b: CubeCoord) {
  // we send two coordinates, and find which axis has the biggest difference
  // distance and return it (it is a whole number)

  // this identifies how many steps we will have
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

export function axialToCube(q: number, r: number) {
  // translate axial cooridantes to cube in order to do math
  // this step is not required because we can just use q, r, s
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export function getHexByAxial(q: number, r: number, mapHexes: Hex[]) {
  return mapHexes.find((hex) => hex.q === q && hex.r === r);
}

export function findNeighbors(hex: Hex, hexes: Hex[]) {
  const neighbors: Hex[] = [];

  for (const dir of HEX_DIRECTIONS) {
    const q = hex.q + dir.dq;
    const r = hex.r + dir.dr;

    const neighbor = hexes.find((n) => n.q === q && n.r === r);
    if (neighbor) neighbors.push(neighbor);
  }

  return neighbors;
}

export function findBuildingNameByCategory({
  buildingCategory,
  level,
}: {
  buildingCategory: BUILDINGS_CATEGORY;
  level: number;
}) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === buildingCategory && value.level === level
  )?.[0] as BuildingType;
}

export function findBuildingDataByCategory({
  buildingCategory,
  level,
}: {
  buildingCategory: BUILDINGS_CATEGORY;
  level: number;
}) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === buildingCategory && value.level === level
  )?.[1];
}

function createBuildingMap() {
  // create a map to avoid O(n) lookup
  const BUILDINGS_BY_CATEGORY_LEVEL = new Map<
    string,
    { name: BuildingType; data: (typeof BUILDINGS)[BuildingType] }
  >();

  // add every building to map
  for (const [name, data] of Object.entries(BUILDINGS)) {
    const key = `${data.category}_${data.level}`; // create a key like CIVILIAN_1
    BUILDINGS_BY_CATEGORY_LEVEL.set(key, {
      name: name as BuildingType,
      data,
    });
  }
  return BUILDINGS_BY_CATEGORY_LEVEL;
}

export function hasSegment(road: Road, a: { q: number; r: number }, b: { q: number; r: number }) {
  const points = road.points;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const direct = p1.q === a.q && p1.r === a.r && p2.q === b.q && p2.r === b.r;

    const reverse = p1.q === b.q && p1.r === b.r && p2.q === a.q && p2.r === a.r;

    if (direct || reverse) return true;
  }

  return false;
}

export function getBuilding({ buildings, id }: { buildings: Building[]; id: string }) {
  return buildings.find((b) => b.id === id);
}

export function startDijkstrasAlgo({
  startingHex,
  endHex,
  mapHexes,
  roads,
}: {
  startingHex: Hex;
  endHex: Hex;
  mapHexes: Hex[];
  roads: Road[];
}) {
  const weightedGraph = Object.fromEntries(createWeightedGraph({ mapHexes, roads, startingHex }));
  const totalNodes = Object.keys(weightedGraph).length;

  const endingPointKey = `${endHex.q},${endHex.r}`;

  // create id set of all nodes
  const nodeIds = new Set<number>();
  for (const [key, neighbors] of Object.entries(weightedGraph)) {
    const [q, r] = key.split(",").map(Number); // get node coordinates
    const nodeHex = getHexByAxial(q, r, mapHexes);
    if (nodeHex) nodeIds.add(nodeHex.id);

    for (const n of neighbors) nodeIds.add(n.hexId);
  }

  // type of { hexId: distance }. Set all nodes to infinity, except starting
  const requiredSteps = new Map<number, number>();
  for (const id of nodeIds) requiredSteps.set(id, Infinity);
  requiredSteps.set(startingHex.id, 0);

  const path = new Map<number, number>();
  const visitedHexIds = new Set<number>();

  let atHexId: number | null = startingHex.id;
  let safety = 0;

  while (atHexId !== null && visitedHexIds.size < totalNodes && safety < 10000) {
    safety++;

    const hex = mapHexes.find((h) => h.id === atHexId);
    if (!hex) throw new Error("Hex not found!");

    const atPoint = `${hex.q},${hex.r}`;
    if (atPoint === endingPointKey) break;

    const neighbors = weightedGraph[atPoint] ?? [];
    const currentDistance = requiredSteps.get(hex.id);

    if (currentDistance === undefined) break;

    // update estimates for neighbors
    for (const graphObj of neighbors) {
      const prevDistance = requiredSteps.get(graphObj.hexId);
      if (prevDistance === undefined) continue;

      const newDistance = currentDistance + graphObj.distance;

      if (newDistance < prevDistance) {
        requiredSteps.set(graphObj.hexId, newDistance);
        path.set(graphObj.hexId, hex.id);
      }
    }

    // add current node as visited
    visitedHexIds.add(hex.id);

    // find node with smallest distance that is UNEXPLORED
    let smallest: number | null = null;
    for (const [hexId, dist] of requiredSteps) {
      if (visitedHexIds.has(hexId)) continue;
      if (dist === Infinity) continue;

      if (smallest === null || dist < (requiredSteps.get(smallest) ?? Infinity)) {
        smallest = hexId;
      }
    }

    if (smallest === null) break;
    atHexId = smallest;
  }

  let fromHexId = endHex.id;
  const pointPath: { q: number; r: number }[] = [];

  while (fromHexId !== startingHex.id) {
    const hex = mapHexes.find((h) => h.id === fromHexId);
    if (!hex) break;

    const prevHexId = path.get(fromHexId);
    if (prevHexId === undefined) break;

    pointPath.push({ q: hex.q, r: hex.r });

    fromHexId = prevHexId;
  }

  // only push if there are other points in array
  if (pointPath.length > 0) {
    pointPath.push({ q: startingHex.q, r: startingHex.r });
  }

  return pointPath.length > 0 ? pointPath.reverse() : null;
}

function createWeightedGraph({
  mapHexes,
  roads,
  startingHex,
}: {
  mapHexes: Hex[];
  roads: Road[];
  startingHex: Hex;
}) {
  const weightedGraph = new Map<string, graphObj>();

  // find hexes that have multiple roads intersecting to use as nodes
  const pointRoadMap = new Map<string, Road[]>();
  for (const road of roads) {
    for (const point of road.points) {
      const prevRoads = pointRoadMap.get(`${point.q},${point.r}`) ?? [];
      pointRoadMap.set(`${point.q},${point.r}`, [...prevRoads, road]);
    }
  }

  // filter out points with buildings
  const buildingPoints = new Map<string, Road[]>();
  for (const [key, roads] of pointRoadMap) {
    if (hasBuilding(key, mapHexes)) {
      buildingPoints.set(key, roads);
    }
  }

  // filter out points that belong to start hex owner
  const ownerPoints = new Set<string>();
  for (const [key, _] of pointRoadMap) {
    const point = key.split(",");
    const hex = getHexByAxial(Number(point[0]), Number(point[1]), mapHexes);

    if (hex && hex.owner === startingHex.owner) {
      ownerPoints.add(key);
    }
  }

  // get building points
  // find all hexes that have buildings AND have road(s)
  const nodes = new Set<string>();
  const nodePointMap = new Map<string, Road[]>();

  for (const [key, roads] of pointRoadMap) {
    const hasRoad = roads.length > 0;

    const noConstruction = roads.every((r) => r.points.every((p) => !p.isConstructing));

    const hasBuildingHere = buildingPoints.has(key);

    const belongsToOwner = ownerPoints.has(key);

    if (
      (hasRoad && noConstruction && belongsToOwner) ||
      (hasBuildingHere && hasRoad && noConstruction && belongsToOwner)
    ) {
      nodes.add(key);
      nodePointMap.set(key, roads);
    }
  }

  // turn intersects into array and loop over to add to graph
  for (const [pointString, roads] of nodePointMap) {
    const point = pointString.split(","); // [0] - q, [1] - r
    for (const road of roads) {
      // split road in two arrays by finding index of point
      const idx = road.points.findIndex(
        (p) => p.q === Number(point[0]) && p.r === Number(point[1])
      );
      if (idx === -1) continue;

      // reverse first chunk to start searching from original point
      const first = road.points.slice(0, idx).reverse();
      const second = road.points.slice(idx + 1);

      // map nodes for both chunks
      mapOverChunk(first);
      mapOverChunk(second);
      function mapOverChunk(chunk: typeof first | typeof second) {
        if (chunk.length > 0) {
          for (const nextPoint of chunk) {
            if (nodes.has(`${nextPoint.q},${nextPoint.r}`)) {
              const prevObjs = weightedGraph.get(`${point[0]},${point[1]}`) ?? [];
              const hex = getHexByAxial(nextPoint.q, nextPoint.r, mapHexes);
              if (!hex) continue;
              const cubeA = axialToCube(Number(point[0]), Number(point[1]));
              const cubeB = axialToCube(nextPoint.q, nextPoint.r);
              const distance = cubeDistance(cubeA, cubeB);
              weightedGraph.set(`${point[0]},${point[1]}`, [
                ...prevObjs,
                { hexId: hex.id, distance: distance },
              ]);
              break; // exit loop after we found 1 node on at least 1 side
            }
          }
        }
      }
    }
  }
  return weightedGraph;
}
function hasBuilding(key: string, mapHexes: Hex[]) {
  const point = key.split(",");

  const hex = mapHexes.find((hex) => hex.q === Number(point[0]) && hex.r === Number(point[1]));
  return hex?.buildingId ? true : false;
}

// estimates consumption of every resource this building can accept
export function estimateConsumption({
  building,
  mapHexes,
}: {
  building: Building;
  mapHexes: Hex[];
}) {
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;

  const consumedResources = BUILDINGS[name].consumptionMod;

  const estConsumption = new Map<string, number>();
  for (const [resource, modifier] of Object.entries(consumedResources)) {
    const consumptionAmount = Math.round(hex.population * modifier * baseConsumeRate);

    estConsumption.set(resource, consumptionAmount);
  }

  return Object.fromEntries(estConsumption);
}

// calculates how much a building should export based on road length, amount, etc.
export function calculateExportAmount({
  startBuilding,
  endBuilding,
  length,
  resource,
  mapHexes,
  buildings,
}: {
  startBuilding: Building;
  endBuilding: Building;
  length: number;
  resource: RESOURCES;
  mapHexes: Hex[];
  buildings: Building[];
}) {
  const consumptionPerTurn = estimateConsumption({ building: endBuilding, mapHexes });
  if (!consumptionPerTurn) return;

  // find other contracts that are exporting this resource to this building
  const contracts = new Set<SupplyContract>();
  for (const building of buildings) {
    // make sure to filter out building that currently owns this contract to
    // get actual export amount and not delta
    if (!building.contracts || building === startBuilding) continue;
    for (const contract of building.contracts) {
      contracts.add(contract);
    }
  }

  const sameExports = [...contracts].filter(
    (c) => c.buildingId === endBuilding.id && c.resource === resource
  );
  let totalExportAmount = 0; // export amount per turn
  for (const contract of sameExports) {
    totalExportAmount += contract.amount / (contract.hexIds.length - 1);
  }

  const neededForExport = consumptionPerTurn[resource]
    ? consumptionPerTurn[resource] - totalExportAmount
    : 0;
  const totalNeededExport = neededForExport * length;
  if (neededForExport > 0) {
    console.log("totalNeededForExport", totalNeededExport);
    return totalNeededExport;
  }
}

export type graphObj = { hexId: number; distance: number }[];
export type CubeCoord = {
  x: number;
  y: number;
  z: number;
};

export type Biome = "desert" | "plains" | "forest" | "mountains";
export type CreatedHexes = {
  desert: number;
  mountains: number;
  plains: number;
  forest: number;
};
export type Hex = {
  id: number;
  biome: Biome | null;
  q: number;
  r: number;
  population: number | null;
  buildingId: string | null;
  owner: string | null;
  build_queue: {
    building: BUILDINGS_CATEGORY;
    progress: number;
    owner: string;
    levels: number;
  } | null;
  army: { amount: number; nationId: string }[];
  wood: number;
};

export const BIOMES: Biome[] = ["desert", "plains", "forest", "mountains"];

export const WOOD_MOD = {
  desert: 0.1,
  mountains: 0.3,
  plains: 0.5,
  forest: 1,
};
export const resources = ["wheat", "wood"] as const;
export type RESOURCES = (typeof resources)[number];

export type BUILDINGS_CATEGORY =
  | "CIVILIAN"
  | "BARRACK"
  | "FARM"
  | "WATCHTOWER"
  | "LUMBERJACK_SETTLEMENT";

export type BuildingConfig = {
  category: BUILDINGS_CATEGORY;
  level: number;
  popCap: number;
  buildTime: number;
  buildCost: number;
  storageCap: Partial<Record<RESOURCES, number>>;
  consumptionMod: Partial<Record<RESOURCES, number>>;
  maxTraining?: number;
  producing?: RESOURCES[];
};
// building data
export const BUILDINGS: Record<string, BuildingConfig> = {
  nomadic_camp: {
    category: "CIVILIAN",
    level: 1,
    popCap: 10,
    buildTime: 3,
    buildCost: 50,
    storageCap: {},
    consumptionMod: { wheat: 1 },
  },
  village: {
    category: "CIVILIAN",
    level: 2,
    popCap: 800,
    buildTime: 6,
    buildCost: 400,
    storageCap: { wheat: 80 },
    consumptionMod: { wheat: 1.2 },
  },
  settlement: {
    category: "CIVILIAN",
    level: 3,
    popCap: 1750,
    buildTime: 12,
    buildCost: 3000,
    storageCap: { wheat: 180, wood: 260 },
    consumptionMod: { wheat: 1.5, wood: 1.3 },
  },
  city: {
    category: "CIVILIAN",
    level: 4,
    popCap: 8000,
    buildTime: 20,
    buildCost: 15000,
    storageCap: { wheat: 700, wood: 1200 },
    consumptionMod: { wheat: 1.9, wood: 1.5 },
  },
  imperial_city: {
    category: "CIVILIAN",
    level: 5,
    popCap: 50000,
    buildTime: 35,
    buildCost: 100000,
    storageCap: { wheat: 6500, wood: 14000 },
    consumptionMod: { wheat: 2.4, wood: 1.9 },
  },

  barrack: {
    category: "BARRACK",
    level: 1,
    popCap: 200,
    buildTime: 30,
    buildCost: 20000,
    storageCap: { wheat: 60 },
    consumptionMod: { wheat: 4 },
    maxTraining: 300,
  },

  farm: {
    category: "FARM",
    level: 1,
    popCap: 80,
    buildTime: 10,
    buildCost: 800,
    storageCap: { wheat: 150 },
    consumptionMod: {},
    producing: ["wheat"],
  },

  watch_tower: {
    category: "WATCHTOWER",
    level: 1,
    popCap: 10,
    buildTime: 5,
    buildCost: 200,
    storageCap: { wheat: 10 },
    consumptionMod: {},
  },

  lumberjack_settlement: {
    category: "LUMBERJACK_SETTLEMENT",
    level: 1,
    popCap: 200,
    buildTime: 10,
    buildCost: 3000,
    storageCap: { wheat: 360, wood: 2000 },
    consumptionMod: { wheat: 2.4 },
    producing: ["wood"],
  },
} as const;

const baseConsumeRate = 0.025; // base consumption rate
// assuming that 1 person consumes 0.025 of resource per 1 modifier
export const baseGoldRate = 0.0125; // 0.0125 gold per person
export const baseWheatRate = 0.32; // 50 wheat bags for every 80 farmers
export const baseWoodRate = 0.07; // 0.07 wood per lumberjack
export const baseTrainingProgress = 0.1; // full training in 10 turns 0.1x10

const LEVEL_CATEGORY = Object.entries(BUILDINGS).map(([key, value]) => ({
  category: value.category,
  level: value.level,
}));

export type Building = {
  // commons
  id: string;
  category: BUILDINGS_CATEGORY;
  level: number;

  // dynamic
  // civilian

  // farm

  // barrack
  trainingTroops?: { amount: number; progress: number; nationId: string }[];
  // lumberjack settlement

  // common properties
  contracts?: SupplyContract[];
  storage?: { type: RESOURCES; amount: number }[];
};

export type SupplyContract = {
  hexIds: number[];
  buildingId: string;
  amount: number;
  resource: RESOURCES;
  progress: number; // make progress to depend on biome. starts from 0
  //  and when it reaches 1 or above add resource to destination
  autoAdjust: boolean;
};

// create building data map
export const BUILDINGS_DATA = createBuildingMap();

// acc is an object that stores values
// object of type { category: {category: string, level: number}}
type AccType = Record<string, { category: BUILDINGS_CATEGORY; level: number }>;

export const topLevelsByCategory = Object.values(
  LEVEL_CATEGORY.reduce((acc, current) => {
    const { category, level } = current;

    // if object with this category doesn't exist in acc, or level of
    // current object is higher than maximum in acc - overwrite or create new
    if (!acc[category] || level > acc[category].level) {
      acc[category] = current;
    }

    return acc;
  }, {} as AccType) // <-- Явно говорим, что это объект с ключами-строками
);

export const ALL_BUILDING_CATEGORIES = topLevelsByCategory.map((obj) => obj.category);

export type BuildingType = keyof typeof BUILDINGS;

export const BIOME_GROWTH = {
  desert: 0.75,
  mountains: 0.65,
  forest: 0.9,
  plains: 1,
};

export const BIOME_MOD = {
  desert: 0.6,
  mountains: 0.5,
  forest: 0.7,
  plains: 1,
};

export const HEX_DIRECTIONS = [
  { dq: +1, dr: 0 },
  { dq: +1, dr: -1 },
  { dq: 0, dr: -1 },
  { dq: -1, dr: 0 },
  { dq: -1, dr: +1 },
  { dq: 0, dr: +1 },
];

export const MAP_RADIUS = 9;
{
  /*export const AVAILABLE_TILES = [
  { q: -9, r: 0 },
  { q: 0, r: -9 },
  { q: 9, r: -9 },
  { q: 9, r: 0 },
  { q: 0, r: 9 },
  { q: -9, r: 9 },
];*/
}
export const AVAILABLE_TILES = [0, 126, 261, 270, 144, 9];

export const NATION_NAMES = {
  Dornguard: "DOR",
  Aldmark: "ALD",
  Westholm: "WES",
  Crownwald: "CRO",
  Vichold: "VIC",
  Brandor: "BRA",
};
export type Nation = {
  id: string;
  capitalTileIdx: number;
  color: string;
  aggression: number;
  expansionBias: number;
  isPlayer: boolean;
  atWar: string[];
  gold: number;
  manpower: number;
};

export type Road = {
  id: string;
  points: { q: number; r: number; d1: number; d2: number; isConstructing: boolean }[];
  constructing: {
    progress: number;
    owner: string; // who is the owner of this construction | if hex
    // doesn't belong to owner, you stop construction
  } | null;
};
