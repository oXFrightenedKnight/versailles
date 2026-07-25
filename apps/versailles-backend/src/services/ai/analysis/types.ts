import { BUILDINGS_CATEGORY, Hex } from "@repo/shared";

export type WorldAnalysis = {
  // world data
  worldData: WorldData;
  selfData: SelfData;
};

export type WorldData = {
  nationsAtWar: NationsWar[]; // ALL nations at war (select own nation later)
  nationsAtPeace: NationsAtPeace[]; // all nations at peace
  neighbors: string[];
  neighborArmies: NeighborArmy[];
  neighborEconomyRatio: EconomyRatio[];
  currentFrontlines: Frontline[];
  currentBorders: { hexId: number; neighborIds: (string | null)[] }[];
  borderingHexes: Hex[];
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
export type NeighborArmy = {
  nationId: string;
  army: number;
};
export type EconomyRatio = {
  nationId: string;
  ratio: number;
};
// frontline of this nation with enemy
export type Frontline = {
  nationId: string;
  hexIds: number[]; // hexes of nation that border enemy
};

export type SelfData = {
  ownedHexCount: number;
  totalArmy: number;
  trainingArmy: { barrackId: string; amount: number }[];
  armyInHexes: { hexId: number; amount: number }[]; // army in own hexes

  buildingCounts: BuildingsByCategoryAndLevel;
  constructing: Constructing[];
  borderBFS: BFSResult[];
};
export type Constructing = {
  hexId: number;
  category: BUILDINGS_CATEGORY;
  levels: number;
  progress: number;
};
export type BFSResult = {
  startHexId: number;
  cameFrom: Map<number, number | null>;
};

export type BuildingsByCategoryAndLevel = Partial<
  Record<BUILDINGS_CATEGORY, { level: number; amount: number }[]>
>;

// values from 0 to 1 (0 - whatever, 1 - i really need to do this intent)
export type AIPressure = {
  enemyStrengthPressure: number; // how much stronger enemies are
  economyPressure: number; // need for more buildings/economy
  expansionOpportunity: number; // chance to attack weaker enemies
};

// ---------
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
