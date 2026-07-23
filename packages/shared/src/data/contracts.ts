import { BASE_RESOURCE } from "./resources";

export type SupplyContract = {
  id: string;
  buildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  progress: number;
  metadata: {
    lastAmountSent: number;
  };
  autoAdjust: boolean;
  usedPath: number[];
};

export type ServerContractUpdate = {
  contractId: string;
  changes: MergedContractChanges;
};

// ensuring both contracts are able to handle "updatable" fields
export type MergedContractChanges = Partial<{
  // contract id
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
}>;
