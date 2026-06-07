// values from 0 to 1 (0 - whatever, 1 - i really need to do this intent)
export type AIPressure = {
  enemyStrengthPressure: number; // how much stronger enemies are
  economyPressure: number; // need for more buildings/economy
  expansionOpportunity: number; // chance to attack weaker enemies
};

export type AIBudget = GoldBudget;
export type BaseBudget = {
  total: number;
};
export type GoldBudget = BaseBudget & {
  reserve: number;
  training: number;
  building: number;
};

export type ResourceBudget = {
  gold: GoldBudget;
};
