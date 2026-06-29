import { GameCtx } from "#trpc/index.js";
import { typeNationResource } from "@repo/shared";

export type AIBudgetCtx = {
  ctx: GameCtx;
  nationId: string;
};

// values from 0 to 1 (0 - whatever, 1 - i really need to do this intent)
export type AIPressure = {
  enemyStrengthPressure: number; // how much stronger enemies are
  economyPressure: number; // need for more buildings/economy
  expansionOpportunity: number; // chance to attack weaker enemies
};

export type BudgetAction = "build" | "roadBuild" | "train" | "move" | "reserve";

export type AIBudget = Map<BudgetAction, number>;

export type ResourceBudget = {
  gold: AIBudget;
};

export type BudgetMap = Map<typeNationResource, AIBudget>;
