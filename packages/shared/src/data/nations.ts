export type PeaceObj = {
  nationId: string;
  turnsRemaining: number;
};
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
  capitalTileIdx: number | null;
  color: string;
  aggression: number;
  expansionBias: number;
  isPlayer: boolean;
  atWar: string[];
  atPeace: PeaceObj[];
  gold: number;
  manpower: number;
  isDefeated?: boolean;
  defeatedAtTurn?: number;
};

export const NATION_NUMBER = 6;

// starting gold
export const BASE_NATION_GOLD = 1000;

// base gold per nation per turn
export const BASE_GOLD_INCOME = 50;

export const NATION_COLORS = [
  "hsl(0 70% 50%)",
  "hsl(58 70% 50%)",
  "hsl(107 70% 50%)",
  "hsl(190 70% 50%)",
  "hsl(268 70% 50%)",
  "hsl(322 70% 50%)",
];
export const FALLBACK_COLOR = "hsl(219 0% 26.8%)";
