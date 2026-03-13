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

export type Biome = "desert" | "plains" | "forest" | "mountains";
export type CreatedHexes = {
  desert: number;
  mountains: number;
  plains: number;
  forest: number;
};
type Road = {
  id: number[];
  level: number;
};
export type Hex = {
  id: number;
  biome: Biome | null;
  q: number;
  r: number;
  population: number | null;
  building: { type: BuildingType } | null;
  owner: string | null;
  build_queue: { building: BuildingType; progress: number; owner: string } | null;
  army: { amount: number; nationId: string }[];
  wood: number;
  road: Road | null;
};
export const BUILD_TIME = {
  nomadic_camp: 0,
  village: 5,
  settlement: 10,
  city: 15,
  imperial_city: 30,
  lumberjack_settlement: 10,
  farm: 10,
  barrack: 30,
  watch_tower: 10,
};
export const BIOMES: Biome[] = ["desert", "plains", "forest", "mountains"];

// estimated population value for each urban type: nomadic_camp - 200, village - 800, settlement - 1750, city - 8000, imperial_city - 50000

export const POPULATION_CAPS = {
  nomadic_camp: 0,
  village: 800,
  settlement: 1750,
  city: 8000,
  imperial_city: 50000,
  lumberjack_settlement: 100,
  farm: 80,
  barrack: 200,
  watch_tower: 10,
};

export const WOOD_MOD = {
  desert: 0.1,
  mountains: 0.3,
  plains: 0.5,
  forest: 1,
};

export type BUILDINGS_CATEGORY =
  | "CIVILIAN"
  | "BARRACK"
  | "FARM"
  | "WATCHTOWER"
  | "LUMBERJACK_SETTLEMENT";

export const BUILDINGS = {
  nomadic_camp: { category: "CIVILIAN", level: 1 },
  village: { category: "CIVILIAN", level: 2 },
  settlement: { category: "CIVILIAN", level: 3 },
  city: { category: "CIVILIAN", level: 4 },
  imperial_city: { category: "CIVILIAN", level: 5 },

  barrack: { category: "BARRACK", level: 1 },

  farm: { category: "FARM", level: 1 },

  watch_tower: { category: "WATCHTOWER", level: 1 },

  lumberjack_settlement: { category: "LUMBERJACK_SETTLEMENT", level: 1 },
} as const;

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

// HELPER FUNCTIONS
