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
  tiles: number[];
  capitalTileIdx: number;
  color: string;
  aggression: number;
  expansionBias: number;
  isPlayer: boolean;
  atWar: string[];
};
