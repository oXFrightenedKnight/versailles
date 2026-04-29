import {
  Building,
  BUILDINGS_CATEGORY,
  Hex,
  Nation,
  RESOURCES,
  Road,
  SupplyContract,
} from "@repo/shared";

export type armyIntent = {
  hexId: number;
  amount: number;
  direction: {
    dq: number;
    dr: number;
  };
};
export type roadObject = {
  id: string;
  points: { q: number; r: number; d1: number; d2: number }[];
};
export type newBuilding = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
};
export type Contract = {
  id: string;
  hexIds: number[];
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: RESOURCES;
  progress: number;
  autoAdjust: boolean;
};
export type BuildModeType = "road" | "none" | BUILDINGS_CATEGORY;
export type ArmyTraining = {
  id: string;
  amount: number;
  progress: number;
  owner: string;
  barrackId: string;
};

export type serverData = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
};

export interface MergedContract extends Contract {
  fromServer: boolean;
}

export type ServerContract = {
  buildingId: string;
  contracts: SupplyContract[];
};
