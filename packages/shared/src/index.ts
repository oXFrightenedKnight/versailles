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

export function buildRoadNodes({
  roads,
  mapHexes,
  buildings,
}: {
  roads: Road[];
  mapHexes: Hex[];
  buildings: Building[];
}) {}

export type graphObj = { hexId: number; distance: number }[];
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
  const weightedGraph = Object.fromEntries(createWeightedGraph({ mapHexes, roads }));
  const totalNodes = Object.keys(weightedGraph).length;

  const startingPointKey = `${startingHex.q},${startingHex.r}`;
  const endingPointKey = `${endHex.q},${endHex.r}`;

  const requiredSteps = new Map<number, number>(
    Object.entries(weightedGraph).flatMap(([key, obj]) =>
      obj.map((o) => [o.hexId, key === startingPointKey ? 0 : Infinity])
    )
  );

  let atPoint: string = startingPointKey;
  const visitedNodes: graphObj = [];

  // DON'T FORGET TO CHECK WHETHER THE PATH EVEN EXISTS
  while (atPoint !== endingPointKey || visitedNodes.length >= totalNodes) {
    // update estimates
    const point = atPoint.split(",");
    const hex = mapHexes.find((h) => h.q === Number(point[0]) && h.r === Number(point[1]));
    if (!hex) continue;
    for (const graphObj of weightedGraph[atPoint]) {
      // get previous estimate of distance
      const currentDistance = requiredSteps.get(hex.id); // current distance traveled so far
      const prevDistance = requiredSteps.get(graphObj.hexId); // previous shortest distance of this node
      if (!currentDistance || !prevDistance) continue;

      // if new path is shorter, set new distance to that length. Else, remain old distance
      const smallest = Math.min(currentDistance + graphObj.distance, prevDistance);

      requiredSteps.set(graphObj.hexId, smallest);
    }

    // find node with smallest estimate
    let smallest: number | null = null; // hexId, NOT distance
    for (const graphObj of weightedGraph[atPoint]) {
      // find that node in requiredSteps
      const currSmallestDist = smallest ? (requiredSteps.get(smallest) ?? 0) : 0;
      const dist = requiredSteps.get(graphObj.hexId);
      if (!dist) continue;
      if (currSmallestDist < dist) {
        smallest = graphObj.hexId;
      }
    }

    if (smallest) {
      const newHexId = requiredSteps.get(smallest);
      const newHex = mapHexes.find((h) => h.id === newHexId);
      if (!newHex) continue;

      // update point
      atPoint = `${newHex.q},${newHex.r}`;
    }
  }

  // temp check
  return atPoint === endingPointKey ? true : false;
}
function createWeightedGraph({ mapHexes, roads }: { mapHexes: Hex[]; roads: Road[] }) {
  const weightedGraph = new Map<string, graphObj>();
  // step 1: build graph (consider road intersects and buildings as nodes)

  // find hexes that have multiple roads intersecting to use as nodes
  const intersectPointRoadMap = new Map<string, Road[]>();
  for (const road of roads) {
    for (const point of road.points) {
      const prevRoads = intersectPointRoadMap.get(`${point.q},${point.r}`) ?? [];
      intersectPointRoadMap.set(`${point.q},${point.r}`, [...prevRoads, road]);
    }
  }

  // turn map into object
  const roadPoints = Object.fromEntries(intersectPointRoadMap);

  // get building points
  // find all hexes that have buildings AND lay on hexes with roads
  const buidlingHexes = mapHexes.filter(
    (hex) => hex.buildingId && Object.keys(roadPoints).some((r) => r === `${hex.q},${hex.r}`)
  );

  // leave arrays with more than 1 road or a building
  const crossingRoadPoints = Object.entries(roadPoints).filter(
    (arr) => arr.length > 1 || hasBuilding(arr[0], mapHexes)
  );

  const nodes = new Set<string>([
    ...buidlingHexes.map((hex) => `${hex.q},${hex.r}`),
    ...crossingRoadPoints.map((a) => a[0]),
  ]);

  // turn intersects into array and loop over to add to graph
  for (const [pointString, roads] of crossingRoadPoints) {
    const point = pointString.split(","); // [0] - q, [1] - r
    for (const road of roads) {
      // split road in two arrays by finding index of point
      const idx = road.points.findIndex(
        (p) => p.q === Number(point[0]) && p.r === Number(point[1])
      );

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
              const cubeA = axialToCube(Number(point[0]), Number(point[1]));
              const cubeB = axialToCube(nextPoint.q, nextPoint.r);
              const distance = cubeDistance(cubeA, cubeB);
              if (!hex) continue;
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
const resources = ["wheat", "wood"] as const;
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
    consumptionMod: {},
  },
  village: {
    category: "CIVILIAN",
    level: 2,
    popCap: 800,
    buildTime: 6,
    buildCost: 400,
    storageCap: { wheat: 80, wood: 100 },
    consumptionMod: {},
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
    storageCap: { wheat: 360, wood: 1000 },
    consumptionMod: { wheat: 2.4 },
  },
} as const;

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
  progress: number; // make progress be dependent on biome. starts from 0
  //  and when it reaches 1 or above add resource to destination
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
