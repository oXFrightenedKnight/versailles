import { BASE_RESOURCE } from "./resources";

export type SupplyContract = {
  id: string;
  fromBuildingId: string;
  toBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  progress: number;
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
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
}>;
