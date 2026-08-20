import { AnswerMail } from "#services/ai/intents/types.js";
import { getNationPeaceReqMails } from "#services/ai/world/mails.js";
import { getNationWarSet, isAtWar } from "#services/army/war.js";
import { getNationArmy } from "#services/genNations.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { PEACE_TARGET_RATIO } from "./policy";
import { getBorderHexes } from "#services/map.js";

// generate peace request mails
export function generateAnswerPeaceReqCandidates(ctx: GameCtx, nation: Nation): AnswerMail[] {
  const answerIntents: AnswerMail[] = [];

  const submitMailAnswer = (mailId: string, answer: boolean) => {
    answerIntents.push({ id: crypto.randomUUID(), type: "answerMail", score: 0, mailId, answer });

    return { ok: true };
  };

  const warSet = getNationWarSet(ctx);

  const ownArmy = getNationArmy(ctx, nation.id) ?? 0;

  const mails = getNationPeaceReqMails(ctx.mails, nation.id);
  // sort mails by countries with strongest armies
  const sortedMails = mails.sort(
    (a, b) =>
      (getNationArmy(ctx, b.metadata.fromNation) ?? 0) -
      (getNationArmy(ctx, a.metadata.fromNation) ?? 0)
  );

  let totalEnemyArmy = nation.atWar
    .filter((enemy) => isAtWar(warSet, nation.id, enemy))
    .reduce((acc, enemy) => acc + (getNationArmy(ctx, enemy) ?? 0), 0);

  const bordering = getBorderHexes(ctx, nation.id);
  const borderingNations = new Set(bordering.map((h) => h.owner));

  for (const mail of sortedMails) {
    const fromNationId = mail.metadata.fromNation;

    if (!isAtWar(warSet, nation.id, fromNationId)) continue;

    // stop accepting peace reqs once the rato is achieved
    if (totalEnemyArmy > ownArmy * PEACE_TARGET_RATIO) {
      submitMailAnswer(mail.id, true);

      const enemyArmy = getNationArmy(ctx, fromNationId) ?? 0;
      totalEnemyArmy -= enemyArmy;
    } else {
      submitMailAnswer(mail.id, false);
    }

    // accept peace request if doesn't have direct border with enemy
    if (!borderingNations.has(fromNationId)) {
      submitMailAnswer(mail.id, true);
    }
  }

  return answerIntents;
}
