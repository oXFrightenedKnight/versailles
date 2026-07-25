import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { WorldAnalysis } from "../analysis/types";
import { ResourceBudget } from "./types";
import { calcGoldBudget } from "./allocation/gold";
import { analyzeAIPressure } from "../analysis/pressure";

export function createAIBudget(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): ResourceBudget {
  const pressure = analyzeAIPressure(ctx, analysis, nation);

  const budgetCtx = { ctx, nationId: nation.id };

  return { gold: calcGoldBudget(budgetCtx, nation.gold, pressure).goldMap };
}
