import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";

export function subtractGold(ctx: GameCtx, nationId: string, amount: number) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return false;

  if (nation.gold >= amount && !(nation.gold < 0)) {
    nation.gold -= amount;
    return true;
  } else {
    return false;
  }
}

// adds X amount of gold once
export function addGold(nation: Nation, amount: number) {
  nation.gold += amount;
  return { ok: true };
}
