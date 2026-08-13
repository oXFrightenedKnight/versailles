import { adjustNationResource } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import {
  Nation,
  BUILDINGS,
  BASE_HEX_POPULATION,
  getBuildingName,
  ActionOfType,
} from "@repo/shared";

export function cancelBuilding(
  ctx: GameCtx,
  cancelActions: ActionOfType<"building.cancel">[],
  nation: Nation
) {
  const hexIdMap = new Map(ctx.mapHexes.filter((h) => h.build_queue).map((h) => [h.id, h]));
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  for (const { hexId: id } of cancelActions) {
    const hex = hexIdMap.get(id);
    if (!hex || !hex.build_queue) continue;
    if (hex.owner !== nation.id) continue;

    // return cost
    const existing = hex.buildingId ? buildingIdMap.get(hex.buildingId) : null;
    for (let level = 1; level < hex.build_queue.levels + 1; level++) {
      const totalLevel = existing ? level + existing.level : level;

      const name = getBuildingName(hex.build_queue.building, totalLevel);
      if (!name) continue;

      // return cost
      const cost = BUILDINGS[name].buildCost;
      adjustNationResource(nation, "gold", cost);
    }

    // cancel building
    hex.build_queue = null;
  }
}

// delete buildings by their id
export function deleteBuilding(
  ctx: GameCtx,
  deleteActions: ActionOfType<"building.delete">[],
  nation: Nation
) {
  const buildingHexMap = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  for (const { buildingId: id } of deleteActions) {
    const building = buildingIdMap.get(id);
    const hex = buildingHexMap.get(id);
    if (!building || !hex) continue;
    if (hex.owner !== nation.id) continue;
    if (nation.capitalTileIdx === hex.id) continue;

    // delete building
    const idx = ctx.buildings.indexOf(building);
    if (idx !== -1) {
      ctx.buildings.splice(idx, 1);
      hex.buildingId = null;
      hex.population = BASE_HEX_POPULATION;
    }
  }
}
