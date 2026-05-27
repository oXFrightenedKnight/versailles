import { BUILDINGS_CATEGORY } from "./buildings";

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
    // progress is the amount of BUILDINGS[building].buildTime.
    // Building is built when progress is >= that value.
    progress: number;
    owner: string;
    levels: number;
  } | null;
  army: { amount: number; nationId: string }[];
  wood: number;
};

export const BASE_HEX_POPULATION = 10; // population after deleting a building

export const BIOMES: Biome[] = ["desert", "plains", "forest", "mountains"];

export const WOOD_MOD = {
  desert: 0.1,
  mountains: 0.3,
  plains: 0.5,
  forest: 1,
};
export const resources = ["wheat", "wood", "gold"] as const;
export type RESOURCES = (typeof resources)[number];
