import { getNationIdMap } from "#simulation/nations/queries";
import { GameCtx } from "#trpc";

export function removePeace(ctx: GameCtx, nationId1: string, nationId2: string) {
  const nationIdMap = getNationIdMap(ctx);

  const nation1 = nationIdMap.get(nationId1);
  const nation2 = nationIdMap.get(nationId2);

  if (!nation1 || !nation2) return;

  nation1.atPeace = nation1.atPeace.filter(({ nationId }) => nationId !== nation2.id);
  nation2.atPeace = nation2.atPeace.filter(({ nationId }) => nationId !== nation1.id);
}

export function signPeace(ctx: GameCtx, nationId1: string, nationId2: string) {
  const nation1 = ctx.nations.find((n) => n.id === nationId1);
  const nation2 = ctx.nations.find((n) => n.id === nationId2);

  if (!nation1 || !nation2) return;
  if (!nation1.atWar.includes(nationId2) || !nation2.atWar.includes(nationId1)) return;

  const idx1 = nation1.atWar.indexOf(nationId2);
  const idx2 = nation2.atWar.indexOf(nationId1);

  nation1.atWar.splice(idx1, 1);
  nation2.atWar.splice(idx2, 1);
  addPeaceTime(ctx, nationId1, nationId2, 30);
}

export function addPeaceTime(ctx: GameCtx, nationId1: string, nationId2: string, turns?: number) {
  const nation1 = ctx.nations.find((n) => n.id === nationId1);
  const nation2 = ctx.nations.find((n) => n.id === nationId2);

  if (!nation1 || !nation2) return;
  if (nation1.atWar.includes(nationId2) || nation2.atWar.includes(nationId1)) return;

  if (turns && turns <= 0) return;

  nation1.atPeace.push({ nationId: nationId2, turnsRemaining: turns ? turns : 30 });
  nation2.atPeace.push({ nationId: nationId1, turnsRemaining: turns ? turns : 30 });
}

export function peaceCountdown(ctx: GameCtx) {
  const nationsAtPeace = ctx.nations.filter((n) => n.atPeace.length > 0);

  for (const nation of nationsAtPeace) {
    const atWarSet = new Set(nation.atWar.map((id) => id));
    const peaceToDelete: string[] = [];

    for (const peaceObj of nation.atPeace) {
      if (atWarSet.has(peaceObj.nationId)) {
        peaceToDelete.push(peaceObj.nationId);
        continue;
      }
      peaceObj.turnsRemaining -= 1;
    }

    for (const nationId of peaceToDelete) {
      removePeace(ctx, nation.id, nationId);
    }

    // remove all expired peace treaties
    nation.atPeace = nation.atPeace.filter((obj) => obj.turnsRemaining > 0);
  }
}
