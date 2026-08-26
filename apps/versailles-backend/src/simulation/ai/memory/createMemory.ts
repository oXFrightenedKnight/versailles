import { Nation } from "@repo/shared";
import { AIMemory } from "./types";
import { GameCtx } from "#trpc";

export function createNationMemo(ctx: GameCtx, nation: Nation) {
  const memo = ctx.aiMemory[nation.id];
  if (!memo) {
    const newMemo: AIMemory = { armyMovement: [], buildSaving: [], attackTargets: [] };
    ctx.aiMemory[nation.id] = newMemo;
    return newMemo;
  }
  return memo;
}
