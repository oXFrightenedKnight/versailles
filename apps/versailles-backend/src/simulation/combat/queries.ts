import { getNationWarSet, isAtWar } from "#simulation/diplomacy/queries";
import { GameCtx } from "#trpc";
import { Hex } from "@repo/shared";

function hasFightingArmies(ctx: GameCtx, hex: Hex) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const warSet = getNationWarSet(ctx);

  let hasFighting = false;
  for (const army of hex.army) {
    const a = nationIdMap.get(army.nationId);
    if (!a) continue;

    for (const opposing of hex.army) {
      if (opposing.nationId === a.id) continue;

      const b = nationIdMap.get(opposing.nationId);
      if (!b) continue;

      if (isAtWar(warSet, a.id, b.id)) hasFighting = true;
    }
  }

  return hasFighting;
}
