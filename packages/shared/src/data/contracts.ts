import { RESOURCES } from "./hex_map";

export type SupplyContract = {
  id: string;
  hexIds: number[];
  buildingId: string;
  amount: number;
  resource: RESOURCES;
  progress: number; // make progress to depend on biome. starts from 0
  //  and when it reaches 1 or above add resource to destination
  metadata: {
    lastAmountSent: number;
  };
  autoAdjust: boolean;
};

export type ServerContractUpdate = {
  contractId: string;
  changes: MergedContractChanges;
};

// ensuring both contracts are able to handle "updatable" fields
export type MergedContractChanges = Partial<{
  // contract id
  amount: number;
  resource: RESOURCES;
  autoAdjust: boolean;
}>;
