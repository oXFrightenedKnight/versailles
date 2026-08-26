import { GameCtx } from "#trpc";
import { getHexById } from "../map/queries";

export function addPopulation({
  ctx,
  hexId,
  amount,
}: {
  ctx: GameCtx;
  hexId: number;
  amount: number;
}) {
  const hex = getHexById(hexId, ctx);

  if (!hex) return;
  if (amount <= 0) return;
  if (hex.population === null) return;

  hex.population += amount;
}
