import { Biome, BUILDINGS_CATEGORY } from "@repo/shared";

export const BIOME_SCORE_MULT: Record<Biome, number> = {
  plains: 1,
  forest: 0.8,
  mountains: 0.6,
  desert: 0.6,
};

export const BuildingScoreTable = {
  neighbor_category_debuff: -15,
  road_bonus: 10,
  base_biome_score: 10,
  building_on_border: -10,
  building_at_war: -10,
  base_ratio_score: 10,
  composition_shortage: 20,
  existing_building: 5,
  shortage_resource: 30,
  missing_foundation_category: 100,
};

// represents table of debuff coefficients for each category during wartime
// the lower the coefficient, the less chance ai will have to build it
export const WAR_DEBUFF_CATEGORIES: Partial<Record<BUILDINGS_CATEGORY, number>> = {
  CIVILIAN: 0.6,
  BARRACK: 0.8,
  WATCHTOWER: 0.7,
  FARM: 0.6,
  WOODCAMP: 0.6,
};
// using a scale 0 to 1 define priority of this building early game
export const FOUNDATION_MINIMUMS: Partial<
  Record<BUILDINGS_CATEGORY, { amount: number; priority: number }>
> = {
  CIVILIAN: { amount: 1, priority: 0.2 },
  FARM: { amount: 1, priority: 1 },
  WOODCAMP: { amount: 1, priority: 0.5 },
  BARRACK: { amount: 1, priority: 0.9 },
  WATCHTOWER: { amount: 1, priority: 0.5 },
};

export const BUILDING_COMPOSITION: Partial<Record<BUILDINGS_CATEGORY, number>> = {
  CIVILIAN: 0.35,
  FARM: 0.2,
  WOODCAMP: 0.15,
  BARRACK: 0.2,
  WATCHTOWER: 0.1,
};
