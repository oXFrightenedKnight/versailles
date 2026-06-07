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

export const nationResources = ["gold", "manpower"] as const;
export type typeNationResource = (typeof nationResources)[number];
