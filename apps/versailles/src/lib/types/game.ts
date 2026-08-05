import { ArmyTrainingObject, BASE_RESOURCE } from "@repo/shared";
import { Building, BUILDINGS_CATEGORY } from "@repo/shared/data/buildings";
import { SupplyContract } from "@repo/shared/data/contracts";
import { Hex } from "@repo/shared/data/hex_map";
import { Mail } from "@repo/shared/data/mail";
import { Nation } from "@repo/shared/data/nations";
import { Road } from "@repo/shared/data/roads";

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
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
  ownerId: string;
};
export type BuildModeType = "road" | "none" | BUILDINGS_CATEGORY;
export type ArmyTraining = {
  id: string;
  amount: number;
  progress: number;
  owner: string;
  barrackId: string;
};

export interface MergedContract extends Contract {
  fromServer: boolean;
}

export type ServerContract = {
  buildingId: string;
  contracts: SupplyContract[];
};
