import { Nation } from "@repo/shared";
import { GameCtx, IntentInput } from "../../trpc";
import { addMail, createPeaceOfferMail, executeMailsAnswers } from "../mails";
import { declareWar } from "../army";

export function runNationDiplomacy(ctx: GameCtx, nation: Nation, intent: IntentInput) {
  // 1. Resolve answered mails
  executeMailsAnswers(ctx, intent.answeredMails, nation);

  // 2. Create peace requests
  createPeaceRequests(ctx, nation.id, intent.signPeaceReq);

  // 3. declare wars on others
  declareWar(ctx, intent.declareWar, nation);
}

export function createPeaceRequests(ctx: GameCtx, nationId: string, peaceNations: string[]) {
  const nationMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const reqNation = nationMap.get(nationId);
  if (!reqNation) return;

  const requested = new Set<string>();

  for (const nationId of peaceNations) {
    if (requested.has(nationId)) continue;
    const peaceNation = nationMap.get(nationId);
    if (!peaceNation) continue;
    if (reqNation.id === nationId) continue;
    if (!reqNation.atWar.includes(nationId) || !peaceNation.atWar.includes(reqNation.id)) continue;

    addMail(ctx, createPeaceOfferMail(ctx, reqNation.id, peaceNation.id));
    requested.add(nationId);
  }
}

export function runAIDiplomacy(ctx: GameCtx, intents: { input: IntentInput; nationId: string }[]) {
  const intentMap = new Map(intents.map((i) => [i.nationId, i.input]));
  for (const aiNation of ctx.nations) {
    if (aiNation.isPlayer) continue;

    const intent = intentMap.get(aiNation.id);
    if (!intent) continue;

    runNationDiplomacy(ctx, aiNation, intent);
  }
}
