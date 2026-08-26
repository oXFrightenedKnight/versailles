import { BASE_RESOURCE } from "../resources/types";

export type SupplyContract = {
  id: string;
  executionOrder: number;

  fromBuildingId: string;
  toBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
  ownerId: string;
};

// ensuring both contracts are able to handle "updatable" fields
export type MergedContractChanges = Partial<{
  // contract id
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
}>;
