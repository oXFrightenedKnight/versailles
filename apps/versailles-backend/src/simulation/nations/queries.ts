import { isAtWar } from "#simulation/diplomacy/queries";
import { GameCtx } from "#trpc";
import { Hex, Nation } from "@repo/shared";

export function getNationArmy(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return null;

  return ctx.mapHexes.reduce((acc, h) => {
    const army = h.army.find((a) => a.nationId === nationId)?.amount ?? 0;
    return acc + army;
  }, 0);
}

export function getHostileArmyHex(hex: Hex, enemiesOf: string, warSet: Set<string>) {
  return hex.army.reduce((acc, a) => {
    const atWar = isAtWar(warSet, a.nationId, enemiesOf);
    return atWar ? acc + a.amount : acc;
  }, 0);
}

export function getNationHexes(hexes: Hex[], nationId: string) {
  return hexes.filter((h) => h.owner && h.owner === nationId);
}

export function getNationById(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (nation) return nation;
  return null;
}

export function getNationIdMap({ nations }: { nations: Nation[] }) {
  return new Map(nations.map((n) => [n.id, n]));
}
