import { BASE_RESOURCE } from "../../resources/types";

export type ContractCalculationInput = {
  contractId: string;

  order: {
    group: "confirmed" | "pending";
    index: number;
  };

  fromBuildingId: string;
  toBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
};

export type ContractCalculationResult = {
  contractId: string;
  calculatedAmount: number;
};

export type ContractCalculationContext = {
  availableByBuilding: ReadonlyMap<string, Partial<Record<BASE_RESOURCE, number>>>;

  requiredByBuilding: ReadonlyMap<string, Partial<Record<BASE_RESOURCE, number>>>;
};
