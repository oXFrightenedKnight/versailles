export const BASE_GOLD_WEIGHTS = {
  train: 0.35,
  build: 0.65,
  roadBuild: 0.2,
  reserve: 0.15,
};

export const BASE_MANPOWER_WEIGHTS = {
  train: 1,
};

export const GOLD_PRESSURE_MULTIPLIERS = {
  enemyStrengthToTraining: 1.2,
  enemyStrengthToBuilding: -0.6,
  economyPressureToBuilding: 0.5,
  expansionToTraining: 0.3,
} as const;

export const GOLD_ALLOCATION_PRIORITY = {
  roadBuild: 50,
};
