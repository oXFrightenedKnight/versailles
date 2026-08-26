import { getNationWarSet, isAtWar } from "#simulation/diplomacy/queries";
import { addMail } from "#simulation/mails/commands";
import { createWarMail } from "#simulation/mails/creation";
import { getNationIdMap } from "#simulation/nations/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";

export function removeWar(ctx: GameCtx, nationId1: string, nationId2: string) {
  const nationIdMap = getNationIdMap(ctx);

  const nation1 = nationIdMap.get(nationId1);
  const nation2 = nationIdMap.get(nationId2);

  if (!nation1 || !nation2) return;

  nation1.atWar = nation1.atWar.filter((id) => id !== nation2.id);
  nation2.atWar = nation2.atWar.filter((id) => id !== nation1.id);
}

export function declareWar(
  ctx: GameCtx,
  warActions: ActionOfType<"diplomacy.war">[],
  nation: Nation
) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const warSet = getNationWarSet(ctx);

  function atPeace(nation: Nation, enemy: Nation) {
    if (nation.atPeace.find((obj) => obj.nationId === enemy.id && obj.turnsRemaining > 0)) {
      return true;
    }
    return false;
  }

  for (const { nationId: id } of warActions) {
    if (nation.id === id) continue; // no declaring war on self

    const enemy = nationIdMap.get(id);
    if (!enemy) continue;

    // skip if already at war
    if (isAtWar(warSet, enemy.id, nation.id)) continue;
    // skip if at peace
    if (atPeace(nation, enemy) || atPeace(enemy, nation)) continue;

    nation.atWar.push(id);
    enemy.atWar.push(nation.id);

    addMail(ctx, createWarMail(ctx, nation.id, id));
  }
}
