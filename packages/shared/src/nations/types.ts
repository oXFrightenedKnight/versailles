import { NationResourceTable } from "../resources/types";

export type Nation = {
  id: string;
  capitalTileIdx: number | null;
  color: string;
  aggression: number;
  expansionBias: number;
  isPlayer: boolean;
  atWar: string[];
  atPeace: PeaceObj[];
  resources: NationResourceTable;
  isDefeated?: boolean;
  defeatedAtTurn?: number;
};

export type PeaceObj = {
  nationId: string;
  turnsRemaining: number;
};
