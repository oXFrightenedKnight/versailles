import { WorldAnalysis } from "#services/ai/analysis/types.js";
import { SignPeaceReqIntent } from "#services/ai/intents/types.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";

// generate peace request mails
function generatePeaceReqCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): SignPeaceReqIntent[] {
  const mailIntents: SignPeaceReqIntent[] = [];

  return mailIntents;
}
