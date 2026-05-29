import { Nation } from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { AIMemory } from "../types/memory";

export function createNationMemo(ctx: GameCtx, nation: Nation) {
  const memo = ctx.aiMemory[nation.id];
  if (!memo) {
    const newMemo: AIMemory = { armyMovement: [] };
    ctx.aiMemory[nation.id] = newMemo;
    return newMemo;
  }
  return memo;
}
