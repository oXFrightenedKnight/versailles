import { SignPeaceReqIntent } from "../../intents/types.js";
import { getNationWarSet, isAtWar } from "../../../army/war.js";
import { getNationArmy } from "../../../genNations.js";
import { hasExistingPeaceRequest } from "../../../mails.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { MAX_RESIST_ARMY_RATIO } from "./policy";
import { getSortedEnemyArmies } from "../../world/armies.js";
import { getBorderHexes } from "../../../map.js";

// generate peace request mails
export function generatePeaceReqCandidates(ctx: GameCtx, nation: Nation): SignPeaceReqIntent[] {
  const peaceIntents: SignPeaceReqIntent[] = [];

  const submitPeaceIntent = (nationId: string) => {
    // don't send peace req if enemy is already asking for it
    if (
      hasExistingPeaceRequest(ctx.mails, nation.id, nationId) ||
      hasExistingPeaceRequest(ctx.mails, nationId, nation.id)
    )
      return { ok: false };

    peaceIntents.push({ id: crypto.randomUUID(), type: "signPeaceReqIntent", score: 0, nationId });

    return { ok: true };
  };

  const warSet = getNationWarSet(ctx);

  const ownArmy = getNationArmy(ctx, nation.id) ?? 0;

  // sort enemies from weakest to strongest
  const enemiesByArmy = getSortedEnemyArmies(ctx, nation);

  let totalEnemyArmy = nation.atWar
    .filter((enemy) => isAtWar(warSet, nation.id, enemy))
    .reduce((acc, enemy) => acc + (getNationArmy(ctx, enemy) ?? 0), 0);

  for (const { nationId: enemy, army: enemyArmy } of enemiesByArmy) {
    // stop requesting if can resist leftover enemy army
    if (totalEnemyArmy <= ownArmy * MAX_RESIST_ARMY_RATIO) break;

    if (!isAtWar(warSet, nation.id, enemy)) continue;

    // submit peace request intent
    submitPeaceIntent(enemy);

    totalEnemyArmy -= enemyArmy;
  }

  // submit peace intents if doesn't border the nation at war
  const bordering = getBorderHexes(ctx, nation.id);
  const borderingNations = new Set(bordering.map((h) => h.owner));

  for (const other of ctx.nations) {
    if (!isAtWar(warSet, nation.id, other.id)) continue;

    if (borderingNations.has(other.id)) continue;

    submitPeaceIntent(other.id);
  }

  return peaceIntents;
}
