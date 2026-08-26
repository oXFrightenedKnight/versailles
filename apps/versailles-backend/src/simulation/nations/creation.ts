import { randomNationColor } from "#simulation/world/generation/generateMap";
import { GameCtx } from "#trpc";

export function createNewNation({
  ctx,
  nationId,
  capitalId,
  agression,
  expansionBias,
  isPlayer,
  baseGold,
}: {
  ctx: GameCtx;
  nationId: string;
  capitalId: number;
  agression: number;
  expansionBias: number;
  isPlayer?: boolean;
  baseGold?: number;
}) {
  ctx.nations.push({
    id: nationId,
    capitalTileIdx: capitalId,
    color: randomNationColor(ctx.nations),
    aggression: agression,
    expansionBias: expansionBias,
    isPlayer: isPlayer ? isPlayer : false,
    atWar: [],
    atPeace: [],
    resources: {
      gold: baseGold ? baseGold : 0,
      manpower: 0,
    },
  });
}
