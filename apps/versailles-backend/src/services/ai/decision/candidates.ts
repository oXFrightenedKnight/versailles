{
  /* General rules for building:
    1. Highest score for plains, lower for other biomes

    Put this into getBuildingCandidates
    */
}

{
  /*
    import { Nation } from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { WorldAnalysis } from "../types/analyze";
import {
  AIIntent,
  AnswerMail,
  ArmyTrain,
  BuildIntent,
  CreateContract,
  DeclareWarIntent,
  MoveArmy,
  SignPeaceReqIntent,
} from "../types/intent";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): AIIntent[] {
  return [
    ...generateBuildCandidates(ctx, analysis, nation),
    ...generateArmyTrainCandidates(ctx, analysis, nation),
    ...generateArmyMoveCandidates(ctx, analysis, nation),
    ...generateBuildRoadCandidates(ctx, analysis, nation),
    ...generateCreateContractCandidates(ctx, analysis, nation),
    ...generateDeclareWarCandidates(ctx, analysis, nation),
    ...generateAnswerMailCandidates(ctx, analysis, nation),
    ...generateSignPeaceReqCandidates(ctx, analysis, nation),
  ];
}

function generateBuildCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): BuildIntent[] {
  const BuildIntents: BuildIntent[] = [];
  const availableNationHexes = ctx.mapHexes.filter((h) => !h.buildingId && h.owner === nation.id);

  for (const hex of availableNationHexes) {
  }

  return BuildIntents;
}

function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): ArmyTrain[] {}

function generateArmyMoveCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): MoveArmy[] {}

function generateBuildRoadCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): BuildRoad[] {}

function generateCreateContractCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): CreateContract[] {}

function generateDeclareWarCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): DeclareWarIntent[] {}

function generateAnswerMailCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): AnswerMail[] {}

function generateSignPeaceReqCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): SignPeaceReqIntent[] {}

    */
}
