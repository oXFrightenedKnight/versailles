import { BASE_RESOURCE, Building, Hex, Nation } from "@repo/shared";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; issue: string };

export type ValidBuildIntentData = {
  hex: Hex;
  building: Building | undefined;
  newTotalLevel: number;
  hexOwner: string;
  currentQueuedLevels: number;
};

export type AllocatedContractResources = Partial<Record<BASE_RESOURCE, number>>;

export type BuildingOutputState = {
  efficiency: number;
  receivedResources: AllocatedContractResources;
};

export type BuildingInfo = {
  hex: Hex;
  nation: Nation | undefined;
};
