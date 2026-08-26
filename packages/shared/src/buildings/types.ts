import { BASE_RESOURCE, PRODUCIBLE_RESOURCE } from "../resources/types";
import { buildingCategories, BUILDINGS } from "./config";

// consider making a union in the future
export type Building = {
  // commons
  id: string;
  category: BUILDINGS_CATEGORY;
  level: number;
  availableResources: Partial<Record<BASE_RESOURCE, number>>;
  statistics: {
    consumed: { resource: PRODUCIBLE_RESOURCE; amount: number }[];
    produced: { resource: PRODUCIBLE_RESOURCE; amount: number }[];
  };
};

export type BuildingConfig = {
  name: string;
  category: BUILDINGS_CATEGORY;
  level: number;
  popCap: number;
  buildTime: number;
  buildCost: number;
  producing?: Partial<Record<PRODUCIBLE_RESOURCE, number>>; // controls how much of each resource building produces at 100% efficiency
  consuming?: Partial<Record<BASE_RESOURCE, ConsumedResource>>;
  systems?: CustomSystems;
};
export type ConsumedResource = {
  weight: number;
  amount: number;
};

// define all custom systems this building owns
export type CustomSystems = {
  armyTraining?: {
    maxTraining: number;
  };
};

export type BUILDINGS_CATEGORY = (typeof buildingCategories)[number];

// acc is an object that stores values
// object of type { category: {category: string, level: number}}
export type AccType = Record<string, { category: BUILDINGS_CATEGORY; level: number }>;

export type BuildingType = keyof typeof BUILDINGS;

export type BuildingsByCategoryAndLevel = Partial<
  Record<BUILDINGS_CATEGORY, { level: number; amount: number }[]>
>;
