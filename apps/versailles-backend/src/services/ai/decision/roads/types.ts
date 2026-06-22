export type BuildingProductionNode = {
  hexId: number;
  buildingId: string;
  available: Partial<Record<"gold" | "wheat" | "wood", number>>;
};

export type BuildingConsumptionNode = {
  hexId: number;
  buildingId: string;
  shortage: Partial<Record<"gold" | "wheat" | "wood", number>>;
};
