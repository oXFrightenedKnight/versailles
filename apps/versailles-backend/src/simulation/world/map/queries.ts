import { GameCtx } from "#trpc";
import { Hex, Nation } from "@repo/shared";
import { HEX_DIRECTIONS } from "@repo/shared/map";

// ONLY WORKS WHEN THE MAP HAS BEEN GENERATED
export function getHexById(id: number, ctx: GameCtx) {
  for (const hex of ctx.mapHexes) {
    if (hex.id === id) {
      return hex as Hex;
    }
  }
  return null;
}

// returns enemy hexes that border with nation
export function getBorderHexes(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => nationId === n.id);
  if (!nation) return [];

  const hexAxialMap = new Map(ctx.mapHexes.map((h) => [`${h.q},${h.r}`, h]));
  const hexIdMap = new Map(ctx.mapHexes.map((h) => [h.id, h]));

  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const neighborHexIds = new Set<number>();

  for (const hex of nationHexes) {
    for (const dir of HEX_DIRECTIONS) {
      const q = hex.q + dir.dq;
      const r = hex.r + dir.dr;

      const neighborHex = hexAxialMap.get(`${q},${r}`);
      if (!neighborHex) continue;
      if (neighborHex.owner === nation.id) continue;

      neighborHexIds.add(neighborHex.id);
    }
  }
  return [...neighborHexIds].flatMap((id) => hexIdMap.get(id) ?? []);
}

// returns hexes of nation that border with other nation
export function getNationBorderHexes(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => nationId === n.id);
  if (!nation) return [];

  const hexAxialMap = new Map(ctx.mapHexes.map((h) => [`${h.q},${h.r}`, h]));

  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  // <hexId, who owns bordering hex>
  const nationBorderHexIds = new Map<number, (string | null)[]>();

  for (const hex of nationHexes) {
    for (const dir of HEX_DIRECTIONS) {
      const q = hex.q + dir.dq;
      const r = hex.r + dir.dr;

      const neighborHex = hexAxialMap.get(`${q},${r}`);
      if (!neighborHex) continue;
      if (neighborHex.owner === nation.id) continue;

      const prevSet = nationBorderHexIds.get(hex.id) ?? [];
      nationBorderHexIds.set(hex.id, [...prevSet, neighborHex.owner]);
    }
  }
  return [...nationBorderHexIds].flatMap(([id, ownerArray]) => ({
    hexId: id,
    neighborIds: ownerArray,
  }));
}

export function getNationArmyFromHex(hex: Hex, nationId: string) {
  return hex.army.find((obj) => obj.nationId === nationId)?.amount ?? 0;
}

// returns hexIds in which nation army is allowed to walk into
export function getAllowedArmyWalk(ctx: GameCtx, nation: Nation) {
  const hexes = new Set<number>();

  for (const hex of ctx.mapHexes) {
    // 1. Nation hexes
    if (hex.owner === nation.id) {
      hexes.add(hex.id);
    }

    // 2. Empty hexes
    if (!hex.owner) {
      hexes.add(hex.id);
    }

    // 3. Enemy hexes
    if (hex.owner && nation.atWar.includes(hex.owner)) {
      hexes.add(hex.id);
    }
  }

  return [...hexes];
}
