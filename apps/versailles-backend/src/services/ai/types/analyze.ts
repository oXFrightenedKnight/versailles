import { Biome, BUILDINGS_CATEGORY } from "@repo/shared";

export type WorldAnalysis = {
  // world data
  worldData: WorldData;
  selfData: SelfData;
};

type WorldData = {
  nationsAtWar: NationsWar[]; // ALL nations at war (select own nation later)
  nationsAtPeace: NationsAtPeace[]; // all nations at peace
  neighborStrength: StrengthRatio[];
  currentFrontlines: Frontline[];
  borderingHexes: BorderedHex[];
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
type StrengthRatio = {
  nationId: string;
  ratio: number; // enemy army compared to your army
};
// frontline of this nation with enemy
type Frontline = {
  nationId: string;
  hexIds: number[]; // hexes of nation that border enemy
};
type BorderedHex = {
  hexId: number;
  ownerId: string | null;
  biome: Biome;
  army: { nationId: string; amount: number }[];
};
type FightingHex = {
  ownArmy: number;
  enemyArmy: number;
  hexPriority: number;
};

export type SelfData = {
  ownedHexCount: number;
  totalArmy: number;
  trainingArmy: { barrackId: string; amount: number };
  armyInHexes: { hexId: number; amount: number };

  buildingCounts: Record<BUILDINGS_CATEGORY, number>;
  constructing: Constructing[];
};
type Constructing = {
  hexId: string;
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
