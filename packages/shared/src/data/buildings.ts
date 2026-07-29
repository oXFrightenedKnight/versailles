import { ArmyTrainingObject } from "./army";
import { SupplyContract } from "./contracts";
import { BASE_RESOURCE, PRODUCIBLE_RESOURCE } from "./resources";

// consider making a union in the future
export type Building = {
  // commons
  id: string;
  category: BUILDINGS_CATEGORY;
  level: number;
  statistics: {
    consumed: { resource: PRODUCIBLE_RESOURCE; amount: number }[];
    produced: { resource: PRODUCIBLE_RESOURCE; amount: number }[];
  };
};

export const building_categoires = [
  "CIVILIAN",
  "BARRACK",
  "FARM",
  "WATCHTOWER",
  "WOODCAMP",
] as const;
export type BUILDINGS_CATEGORY = (typeof building_categoires)[number];

export type BuildingConfig = {
  name: string;
  category: BUILDINGS_CATEGORY;
  level: number;
  popCap: number;
  buildTime: number;
  buildCost: number;
  maxTraining?: number;
  producing?: Partial<Record<PRODUCIBLE_RESOURCE, number>>; // controls how much of each resource building produces at 100% efficiency
  consuming?: Partial<Record<BASE_RESOURCE, ConsumedResource>>;
};
export type ConsumedResource = {
  weight: number;
  amount: number;
};

// building data
export const BUILDINGS: Record<string, BuildingConfig> = {
  nomadic_camp: {
    name: "Nomadic Camp",
    category: "CIVILIAN",
    level: 1,
    popCap: 10,
    buildTime: 3,
    buildCost: 50,
    producing: {},
  },
  village: {
    name: "Village",
    category: "CIVILIAN",
    level: 2,
    popCap: 800,
    buildTime: 6,
    buildCost: 400,
    storageCap: { wheat: 80 },
    consumptionMod: { wheat: 1.2 },
    producing: ["gold"],
  },
  settlement: {
    name: "Settlement",
    category: "CIVILIAN",
    level: 3,
    popCap: 1750,
    buildTime: 12,
    buildCost: 3000,
    storageCap: { wheat: 180, wood: 260 },
    consumptionMod: { wheat: 1.5, wood: 1.3 },
    producing: ["gold"],
  },
  city: {
    name: "City",
    category: "CIVILIAN",
    level: 4,
    popCap: 8000,
    buildTime: 20,
    buildCost: 15000,
    storageCap: { wheat: 700, wood: 1200 },
    consumptionMod: { wheat: 1.9, wood: 1.5 },
    producing: ["gold"],
  },
  imperial_city: {
    name: "Imperial City",
    category: "CIVILIAN",
    level: 5,
    popCap: 50000,
    buildTime: 35,
    buildCost: 100000,
    storageCap: { wheat: 6500, wood: 14000 },
    consumptionMod: { wheat: 2.4, wood: 1.9 },
    producing: ["gold"],
  },

  barrack1: {
    name: "Barrack I",
    category: "BARRACK",
    level: 1,
    popCap: 30,
    buildTime: 10,
    buildCost: 1600,
    storageCap: { wheat: 20 },
    consumptionMod: { wheat: 4 },
    maxTraining: 50,
  },
  barrack2: {
    name: "Barrack II",
    category: "BARRACK",
    level: 2,
    popCap: 125,
    buildTime: 20,
    buildCost: 9000,
    storageCap: { wheat: 150 },
    consumptionMod: { wheat: 4 },
    maxTraining: 250,
  },
  barrack3: {
    name: "Barrack III",
    category: "BARRACK",
    level: 3,
    popCap: 1000,
    buildTime: 40,
    buildCost: 60000,
    storageCap: { wheat: 900 },
    consumptionMod: { wheat: 3.8 },
    maxTraining: 1500,
  },

  farm1: {
    name: "Farm I",
    category: "FARM",
    level: 1,
    popCap: 80,
    buildTime: 10,
    buildCost: 800,
    storageCap: { wheat: 150 },
    consumptionMod: {},
    producing: ["wheat"],
  },
  farm2: {
    name: "Farm II",
    category: "FARM",
    level: 2,
    popCap: 400,
    buildTime: 15,
    buildCost: 3600,
    storageCap: { wheat: 900 },
    consumptionMod: { wood: 4 },
    producing: ["wheat"],
  },

  watch_tower1: {
    name: "Watch Tower I",
    category: "WATCHTOWER",
    level: 1,
    popCap: 10,
    buildTime: 5,
    buildCost: 200,
    storageCap: { wheat: 10 },
    consumptionMod: {},
  },

  woodcamp1: {
    name: "Woodcamp I",
    category: "WOODCAMP",
    level: 1,
    popCap: 200,
    buildTime: 10,
    buildCost: 3000,
    storageCap: { wheat: 360, wood: 2000 },
    consumptionMod: { wheat: 2.4 },
    producing: ["wood"],
  },
} as const;

export const baseConsumeRate = 0.025; // base consumption rate
// assuming that 1 person consumes 0.025 of resource per 1 modifier
export const ResourceRates: Partial<Record<PRODUCIBLE_RESOURCE, number>> = {
  gold: 0.0125, // 0.0125 gold per person
  wheat: 0.32, // 50 wheat bags for every 80 farmers
  wood: 0.07, // 0.07 wood per woodcamp
};
export const baseTrainingProgress = 0.1; // full training in 10 turns 0.1x10

const LEVEL_CATEGORY = Object.entries(BUILDINGS).map(([key, value]) => ({
  category: value.category,
  level: value.level,
}));

// acc is an object that stores values
// object of type { category: {category: string, level: number}}
type AccType = Record<string, { category: BUILDINGS_CATEGORY; level: number }>;

export const topLevelsByCategory = Object.values(
  LEVEL_CATEGORY.reduce((acc, current) => {
    const { category, level } = current;

    // if object with this category doesn't exist in acc, or level of
    // current object is higher than maximum in acc - overwrite or create new
    if (!acc[category] || level > acc[category].level) {
      acc[category] = current;
    }

    return acc;
  }, {} as AccType)
);

export const ALL_BUILDING_CATEGORIES = topLevelsByCategory.map((obj) => obj.category);

export type BuildingType = keyof typeof BUILDINGS;

// Base wheat that capitals get per turn to allow early self-sustainment
export const BASE_CAPITAL_WHEAT = 20;

export type BuildingsByCategoryAndLevel = Partial<
  Record<BUILDINGS_CATEGORY, { level: number; amount: number }[]>
>;
