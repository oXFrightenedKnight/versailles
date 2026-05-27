import { BUILDINGS_CATEGORY, Hex } from "@repo/shared";

export type WorldAnalysis = {
  // world data
  worldData: WorldData;
  selfData: SelfData;
};

export type WorldData = {
  nationsAtWar: NationsWar[]; // ALL nations at war (select own nation later)
  nationsAtPeace: NationsAtPeace[]; // all nations at peace
  neighborStrength: StrengthRatio[];
  currentFrontlines: Frontline[];
  borderingHexes: Hex[];
  fightingHexes: FightingHex[];
};
type NationsWar = {
  nationId1: string;
  nationId2: string;
};
type NationsAtPeace = {
  nationId1: string;
  nationId2: string;
  turnsLeft: number;
};
// strength ratio is average combined stats of neighbor to nation
export type StrengthRatio = {
  nationId: string;
  ratio: number; // enemy army compared to your army
};
// frontline of this nation with enemy
export type Frontline = {
  nationId: string;
  hexIds: number[]; // hexes of nation that border enemy
};
export type FightingHex = {
  id: number;
  ownArmy: number;
  enemyArmy: number;
  hexPriority: number; // 0 - not important, 1 - very important
};

export type SelfData = {
  ownedHexCount: number;
  totalArmy: number;
  trainingArmy: { barrackId: string; amount: number }[];
  armyInHexes: { hexId: number; amount: number }[]; // army in own hexes

  buildingCounts: BuildingsByCategoryAndLevel;
  constructing: Constructing[];
};
export type Constructing = {
  hexId: number;
  category: BUILDINGS_CATEGORY;
  levels: number;
  progress: number;
};

export type BuildingsByCategoryAndLevel = Partial<
  Record<BUILDINGS_CATEGORY, Record<number, number>>
>;
// example type
// CIVILIAN: {
//  1: 15, // level: amount
// 2: 8,
// 5: 1
//}

export const ARMY_WEIGHT = 1;
export const BORDER_ARMY_WEIGHT = 1.25;
export const GOLD_WEIGHT = 0.1;
export const BUILDING_WEIGHT = 0.25;

export const BUILDING_PRIORITY: Record<BUILDINGS_CATEGORY, number> = {
  CIVILIAN: 1,
  FARM: 0.8,
  WOODCAMP: 0.8,
  BARRACK: 0.9,
  WATCHTOWER: 0.2,
};
