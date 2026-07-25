import { WorldAnalysis } from "#services/ai/analysis/types.js";
import { AnswerMail } from "#services/ai/intents/types.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";

// generate response to peace proposals
function generateAnswerMailCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): AnswerMail[] {
  const mailIntents: AnswerMail[] = [];

  return mailIntents;
}
