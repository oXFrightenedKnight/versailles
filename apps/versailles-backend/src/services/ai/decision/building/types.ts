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
  skewed_ratio: 10,
  same_existing_category: 5,
  shortage_resource: 10,
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
// how many of this building category should there be for every civilian?
export const BUILDING_RATIO: Partial<Record<BUILDINGS_CATEGORY, number>> = {
  CIVILIAN: 1,
  FARM: 0.9,
  WOODCAMP: 0.7,
  WATCHTOWER: 0.7,
  BARRACK: 0.3,
};
