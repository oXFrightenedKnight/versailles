import { BASE_RESOURCE, PRODUCIBLE_RESOURCE } from "./resources";

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

// building data
export const BUILDINGS: Record<string, BuildingConfig> = {
  nomadic_camp: {
    name: "Nomadic Camp",
    category: "CIVILIAN",
    level: 1,
    popCap: 10,
    buildTime: 3,
    buildCost: 50,
    producing: { gold: 1 },
  },
  village: {
    name: "Village",
    category: "CIVILIAN",
    level: 2,
    popCap: 200,
    buildTime: 6,
    buildCost: 1125,
    producing: { gold: 25 },
    consuming: { wheat: { weight: 1, amount: 25 } },
  },
  settlement: {
    name: "Settlement",
    category: "CIVILIAN",
    level: 3,
    popCap: 2000,
    buildTime: 12,
    buildCost: 9350,
    consuming: { wheat: { weight: 1, amount: 125 } },
    producing: { gold: 275 },
  },
  city: {
    name: "City",
    category: "CIVILIAN",
    level: 4,
    popCap: 8000,
    buildTime: 20,
    buildCost: 37500,
    consuming: { wheat: { weight: 0.7, amount: 500 }, wood: { weight: 0.3, amount: 3000 } },
    producing: { gold: 1500 },
  },
  imperial_city: {
    name: "Imperial City",
    category: "CIVILIAN",
    level: 5,
    popCap: 60000,
    buildTime: 35,
    buildCost: 300000,
    consuming: { wheat: { weight: 0.6, amount: 4000 }, wood: { weight: 0.4, amount: 27500 } },
    producing: { gold: 14000 },
  },

  barrack1: {
    name: "Barrack I",
    category: "BARRACK",
    level: 1,
    popCap: 15,
    buildTime: 10,
    buildCost: 1600,
    consuming: { wheat: { weight: 1, amount: 50 } },
    systems: {
      armyTraining: {
        maxTraining: 25,
      },
    },
  },
  barrack2: {
    name: "Barrack II",
    category: "BARRACK",
    level: 2,
    popCap: 125,
    buildTime: 20,
    buildCost: 9000,
    consuming: { wheat: { weight: 1, amount: 600 } },
    systems: {
      armyTraining: {
        maxTraining: 250,
      },
    },
  },
  barrack3: {
    name: "Barrack III",
    category: "BARRACK",
    level: 3,
    popCap: 1000,
    buildTime: 40,
    buildCost: 450000,
    consuming: { wheat: { weight: 1, amount: 10000 } },
    systems: {
      armyTraining: {
        maxTraining: 5000,
      },
    },
  },

  farm1: {
    name: "Farm I",
    category: "FARM",
    level: 1,
    popCap: 20,
    buildTime: 10,
    buildCost: 800,
    producing: { wheat: 40 },
  },
  farm2: {
    name: "Farm II",
    category: "FARM",
    level: 2,
    popCap: 80,
    buildTime: 15,
    buildCost: 5500,
    producing: { wheat: 200 },
  },
  farm3: {
    name: "Farm III",
    category: "FARM",
    level: 3,
    popCap: 350,
    buildTime: 20,
    buildCost: 15000,
    producing: { wheat: 900 },
  },
  farm4: {
    name: "Farm IV",
    category: "FARM",
    level: 4,
    popCap: 2900,
    buildTime: 40,
    buildCost: 175000,
    producing: { wheat: 10000 },
  },

  watch_tower1: {
    name: "Watch Tower I",
    category: "WATCHTOWER",
    level: 1,
    popCap: 5,
    buildTime: 3,
    buildCost: 200,
  },

  woodcamp1: {
    name: "Woodcamp I",
    category: "WOODCAMP",
    level: 1,
    popCap: 200,
    buildTime: 10,
    buildCost: 15000,
    consuming: { wheat: { weight: 1, amount: 200 } },
    producing: { wood: 5000 },
  },
  woodcamp2: {
    name: "Woodcamp II",
    category: "WOODCAMP",
    level: 2,
    popCap: 1800,
    buildTime: 30,
    buildCost: 125000,
    consuming: { wheat: { weight: 1, amount: 1800 } },
    producing: { wood: 40000 },
  },
} as const;

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

export type BuildingsByCategoryAndLevel = Partial<
  Record<BUILDINGS_CATEGORY, { level: number; amount: number }[]>
>;
