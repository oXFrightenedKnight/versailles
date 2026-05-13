import { ArmyTrainingObject } from "./army";
import { SupplyContract } from "./contracts";
import { RESOURCES } from "./hex_map";

// consider making a union in the future
export type Building = {
  // commons
  id: string;
  category: BUILDINGS_CATEGORY;
  level: number;

  // dynamic
  // civilian

  // farm

  // barrack
  trainingTroops?: ArmyTrainingObject[];
  // woodcamp

  // common properties
  contracts?: SupplyContract[];
  storage?: { type: RESOURCES; amount: number }[];
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
  category: BUILDINGS_CATEGORY;
  level: number;
  popCap: number;
  buildTime: number;
  buildCost: number;
  storageCap: Partial<Record<RESOURCES, number>>;
  consumptionMod: Partial<Record<RESOURCES, number>>;
  maxTraining?: number;
  producing?: RESOURCES[];
};
// building data
export const BUILDINGS: Record<string, BuildingConfig> = {
  nomadic_camp: {
    category: "CIVILIAN",
    level: 1,
    popCap: 10,
    buildTime: 3,
    buildCost: 50,
    storageCap: {},
    consumptionMod: { wheat: 1 },
  },
  village: {
    category: "CIVILIAN",
    level: 2,
    popCap: 800,
    buildTime: 6,
    buildCost: 400,
    storageCap: { wheat: 80 },
    consumptionMod: { wheat: 1.2 },
  },
  settlement: {
    category: "CIVILIAN",
    level: 3,
    popCap: 1750,
    buildTime: 12,
    buildCost: 3000,
    storageCap: { wheat: 180, wood: 260 },
    consumptionMod: { wheat: 1.5, wood: 1.3 },
  },
  city: {
    category: "CIVILIAN",
    level: 4,
    popCap: 8000,
    buildTime: 20,
    buildCost: 15000,
    storageCap: { wheat: 700, wood: 1200 },
    consumptionMod: { wheat: 1.9, wood: 1.5 },
  },
  imperial_city: {
    category: "CIVILIAN",
    level: 5,
    popCap: 50000,
    buildTime: 35,
    buildCost: 100000,
    storageCap: { wheat: 6500, wood: 14000 },
    consumptionMod: { wheat: 2.4, wood: 1.9 },
  },

  barrack: {
    category: "BARRACK",
    level: 1,
    popCap: 200,
    buildTime: 30,
    buildCost: 20000,
    storageCap: { wheat: 60 },
    consumptionMod: { wheat: 4 },
    maxTraining: 300,
  },

  farm: {
    category: "FARM",
    level: 1,
    popCap: 80,
    buildTime: 10,
    buildCost: 800,
    storageCap: { wheat: 150 },
    consumptionMod: {},
    producing: ["wheat"],
  },

  watch_tower: {
    category: "WATCHTOWER",
    level: 1,
    popCap: 10,
    buildTime: 5,
    buildCost: 200,
    storageCap: { wheat: 10 },
    consumptionMod: {},
  },

  woodcamp: {
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
export const baseGoldRate = 0.0125; // 0.0125 gold per person
export const baseWheatRate = 0.32; // 50 wheat bags for every 80 farmers
export const baseWoodRate = 0.07; // 0.07 wood per woodcamp
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
  }, {} as AccType) // <-- Явно говорим, что это объект с ключами-строками
);

export const ALL_BUILDING_CATEGORIES = topLevelsByCategory.map((obj) => obj.category);

export type BuildingType = keyof typeof BUILDINGS;
