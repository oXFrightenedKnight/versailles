import { declareWar } from "#simulation/diplomacy/war";
import { executeMailsAnswers, addMail } from "#simulation/mails/commands";
import { createPeaceOfferMail } from "#simulation/mails/creation";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { ActionBuckets, getActions, ActionOfType } from "@repo/shared/actions";

export function runNationDiplomacy(ctx: GameCtx, nation: Nation, actions: ActionBuckets) {
  if (nation.isDefeated) return;
  // 1. Resolve answered mails
  executeMailsAnswers(ctx, getActions(actions, "mails.answer"), nation);

  // 2. Create peace requests
  createPeaceRequests(ctx, nation.id, getActions(actions, "diplomacy.peace"));

  // 3. declare wars on others
  declareWar(ctx, getActions(actions, "diplomacy.war"), nation);
}

export function createPeaceRequests(
  ctx: GameCtx,
  nationId: string,
  peaceActions: ActionOfType<"diplomacy.peace">[]
) {
  const nationMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const reqNation = nationMap.get(nationId);
  if (!reqNation) return;

  const requested = new Set<string>();

  for (const { nationId } of peaceActions) {
    if (requested.has(nationId)) continue;
    const peaceNation = nationMap.get(nationId);
    if (!peaceNation) continue;
    if (reqNation.id === nationId) continue;
    if (!reqNation.atWar.includes(nationId) || !peaceNation.atWar.includes(reqNation.id)) continue;

    addMail(ctx, createPeaceOfferMail(ctx, reqNation.id, peaceNation.id));
    requested.add(nationId);
  }
}

export function runAIDiplomacy(
  ctx: GameCtx,
  intents: { actions: ActionBuckets; nationId: string }[]
) {
  const actionMap = new Map(intents.map((i) => [i.nationId, i.actions]));
  for (const aiNation of ctx.nations) {
    if (aiNation.isPlayer) continue;

    const actions = actionMap.get(aiNation.id);
    if (!actions) continue;

    runNationDiplomacy(ctx, aiNation, actions);
  }
}
