import { getBorderHexes } from "#simulation/world/map/queries";
import { GameCtx } from "#trpc";
import { Nation, Hex } from "@repo/shared";
import { getHexAxialMap, findNeighbors } from "@repo/shared/map";
import { getAvailableArmyForCategory } from "../../planning/reservations/armyReserve.js";
import { AIPlanningState } from "../../planning/types.js";
import { ProposalArmyMove } from "./types";

export function getExpansionProposals(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const proposals: ProposalArmyMove[] = [];

  const emptyHexes = getBorderHexes(ctx, nation.id).filter((h) => !h.owner);

  const axialMap = getHexAxialMap(ctx);

  // map over all bordering empty hexes
  for (const hex of emptyHexes) {
    const intents = calcEmptyHexAttack(ctx, planning, hex, axialMap);

    for (const expansionIntent of intents) {
      const intent: ProposalArmyMove = {
        path: [expansionIntent.startId, expansionIntent.endId],
        amount: expansionIntent.amount,
        category: "expansion_move",
      };

      proposals.push(intent);
    }
  }

  return proposals;
}

// calculate attack on empty hexes
export function calcEmptyHexAttack(
  ctx: GameCtx,
  planning: AIPlanningState,
  hex: Hex,
  axialMap: Map<string, Hex>
) {
  const attackIntent: { startId: number; endId: number; amount: number }[] = [];

  // find first neighbor hex that has available army and move
  const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);
  for (const neighbor of neighbors) {
    const army = getAvailableArmyForCategory(planning, neighbor.id, "expansion_move");
    if (army >= 0) attackIntent.push({ startId: neighbor.id, endId: hex.id, amount: army });
  }

  return attackIntent;
}
