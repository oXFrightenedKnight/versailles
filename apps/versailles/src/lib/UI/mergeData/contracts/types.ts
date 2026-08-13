import { BASE_RESOURCE } from "@repo/shared";

export type ContractBase = {
  key: string;
  contractId: string;
  executionOrder: number;

  fromBuildingId: string;
  toBuildingId: string;

  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
};

export type ContractProjection =
  | (ContractBase & {
      source: "server";
      contractId: string;
    })
  | (ContractBase & {
      source: "pending";
      actionId: string;
    });
