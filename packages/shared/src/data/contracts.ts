import { RESOURCES } from "./hex_map";

export type SupplyContract = {
  id: string;
  buildingId: string;
  amount: number;
  resource: RESOURCES;
  progress: number;
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
