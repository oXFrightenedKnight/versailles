import { BASE_RESOURCE } from "@repo/shared";

export type BuildingProductionNode = {
  hexId: number;
  buildingId: string;
  available: Partial<Record<BASE_RESOURCE, number>>;
};

export type BuildingConsumptionNode = {
  hexId: number;
  buildingId: string;
  shortage: Partial<Record<BASE_RESOURCE, number>>;
};
