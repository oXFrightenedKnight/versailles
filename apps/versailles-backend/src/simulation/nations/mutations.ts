import { removePeace } from "#simulation/diplomacy/peace";
import { getNationWarSet, getPeaceSet, isAtWar, isAtPeace } from "#simulation/diplomacy/queries";
import { removeWar } from "#simulation/diplomacy/war";
import { getNationById } from "#simulation/nations/queries";
import { GameCtx } from "#trpc";
import { Nation, Hex } from "@repo/shared";

export function setDefeated(ctx: GameCtx, defeatedNation: Nation) {
  defeatedNation.capitalTileIdx = null;
  defeatedNation.isDefeated = true;

  const warSet = getNationWarSet(ctx);
  const peaceSet = getPeaceSet(ctx);

  // remove war and peace with every nation
  for (const nation of ctx.nations) {
    if (nation.id === defeatedNation.id) continue;

    if (isAtWar(warSet, nation.id, defeatedNation.id)) {
      removeWar(ctx, nation.id, defeatedNation.id);
    }

    if (isAtPeace(peaceSet, nation.id, defeatedNation.id)) {
      removePeace(ctx, nation.id, defeatedNation.id);
    }
  }
}

// assigns hex with highest population of owner to be new capital
export function assignNewCapital(ctx: GameCtx, nationId: string) {
  const nation = getNationById(ctx, nationId);
  if (!nation) return;
  const ownerHexes = ctx.mapHexes.filter((h) => h.owner === nationId);

  const newCapital = ownerHexes.reduce<Hex>((acc, h) => {
    return (h.population ?? 0) > (acc.population ?? 0) ? h : acc;
  }, ownerHexes[0]);

  nation.capitalTileIdx = newCapital ? newCapital.id : null;
}
