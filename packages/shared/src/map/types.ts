import { BUILDINGS_CATEGORY } from "../buildings/types";

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
  army: HexArmy[];
  wood: number;
};

export type HexArmy = { amount: number; nationId: string };
