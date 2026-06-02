import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { createNationMemo } from "../../../memory/main";
import { WorldAnalysis } from "../../../types/analyze";
import { MoveArmy } from "../../../types/intent";
import { createPlanningState, planArmyMove, populateIncomingPlanning } from "../../planning/main";
import { analyzeNationBorder, getArmySupply } from "./analyze";
import { calcEmptyHexAttack, calcEnemyAttack } from "./attackOptions";
import { calcAIDefenseMove } from "./defenseOptions";

export function generateArmyMoveCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): MoveArmy[] {
  const planning = createPlanningState(ctx, nation.id);

  const armyMoveIntents: MoveArmy[] = [];
  const addMoveIntent = (fromHexId: number, toHexId: number, score: number, amount: number) => {
    const intent = planArmyMove(planning, fromHexId, toHexId, amount, score);
    if (!intent) return;
    armyMoveIntents.push(intent);
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, nation);
  const sortedBorders = borderAnalysis.sort((a, b) => b.priority - a.priority);
  const armySupplyPoints = getArmySupply(ctx, analysis, borderAnalysis);

  const nationMemo = ctx.aiMemory[nation.id] ?? createNationMemo(ctx, nation);
  populateIncomingPlanning(planning, nationMemo);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const borderBFSMap = new Map(analysis.selfData.borderBFS.map((b) => [b.startHexId, b]));

  // for each border hex, find closest army supply point and create army move intent
  // start from highest priority hexes
  for (const borderHex of sortedBorders) {
    const intents = calcAIDefenseMove(borderHex, armySupplyPoints, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  // Score attack for each enemy at border
  for (const enemyId of nation.atWar) {
    const intents = calcEnemyAttack(
      ctx,
      analysis,
      planning,
      nation,
      enemyId,
      nationIdMap,
      hexIdMap,
      axialMap
    );
    if (!intents) continue;

    // create each intent
    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  // Score movement to empty hexes
  const emptyBorderHexes = analysis.worldData.borderingHexes.filter((h) => !h.owner);
  for (const hex of emptyBorderHexes) {
    const intents = calcEmptyHexAttack(ctx, planning, hex, axialMap);

    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  return armyMoveIntents;
}
