import { getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { getBuilding, Hex, Building, Nation, BuildingsByCategoryAndLevel } from "@repo/shared";

export function getBuildingInHex(ctx: GameCtx, hexId: number) {
  const hex = ctx.mapHexes.find((h) => h.id === hexId);

  if (hex?.buildingId) {
    const building = getBuilding({ buildings: ctx.buildings, id: hex.buildingId });
    if (building) return building;
    return null;
  } else {
    return null;
  }
}

export function getNationBuildingCount(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return {};

  const nationBuildHexes = ctx.mapHexes.filter((h) => h.buildingId && h.owner === nationId);

  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));
  const buildCount: BuildingsByCategoryAndLevel = {};

  for (const hex of nationBuildHexes) {
    const building = buildingIdMap.get(hex.buildingId!);
    if (!building) continue;

    const categoryCount = (buildCount[building.category] ??= []);
    const levelObj = categoryCount.find((c) => c.level === building.level);

    if (levelObj) {
      levelObj.amount++;
    } else {
      categoryCount.push({ level: building.level, amount: 1 });
    }
  }

  return buildCount;
}

// this function returns expected building in hex (queued + current)
export function getOptimisticBuildInHex(
  ctx: GameCtx,
  hexId: number,
  hexIdMapProp?: Map<number, Hex>,
  buildingIdMapProp?: Map<string, Building>
) {
  const hexIdMap = hexIdMapProp ?? getHexIdMap(ctx);
  const buildingIdMap = buildingIdMapProp ?? getBuildingsByIdMap(ctx.buildings);

  const hex = hexIdMap.get(hexId);
  const queued = hex?.build_queue ?? null;
  const existing = hex?.buildingId ? (buildingIdMap.get(hex.buildingId) ?? null) : null;

  if (!queued && !existing) return null;
  // if both exist but their categories don't match
  if (existing && queued) {
    if (queued.building !== existing.category) return null;
  }

  const category = existing?.category ?? queued?.building ?? null;
  if (!category) return null;

  const level = (existing?.level ?? 0) + (queued?.levels ?? 0);

  return { category, level };
}

export function getNationBuildings(ctx: GameCtx, nation: Nation) {
  const hexBuildingMap = new Map(
    ctx.mapHexes
      .filter((h) => h.owner === nation.id)
      .flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );

  return ctx.buildings.filter((b) => hexBuildingMap.has(b.id));
}

export function getBuildingsByIdMap(buildings: Building[]) {
  return new Map(buildings.map((b) => [b.id, b]));
}
