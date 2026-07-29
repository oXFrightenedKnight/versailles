import { GameCtx } from "#trpc/index.js";
import { NATION_RESOURCE } from "@repo/shared";

export type AIBudgetCtx = {
  ctx: GameCtx;
  nationId: string;
  foundationComplete: boolean;
  barrackLevels: number;
};

export type BudgetAction = "build" | "roadBuild" | "train" | "move" | "reserve";

export type AIBudget = Map<BudgetAction, number>;

export type ResourceBudget = {
  gold: AIBudget;
};

export type BudgetMap = Map<NATION_RESOURCE, AIBudget>;

export type ActionWeight = { action: BudgetAction; weight: number };

export type BudgetAllocationRequest = {
  action: BudgetAction;
  amount: number;
  priority: number;
  mode: "exact" | "minimum";
};
