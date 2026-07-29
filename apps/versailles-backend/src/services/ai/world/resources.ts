import { getNationBuildings } from "#services/buildings/queries.js";
import { getContractPerTurn } from "#services/contracts.js";
import { calculateResourceOutput } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import {
  Nation,
  BASE_RESOURCE,
  findBuildingNameByCategory,
  BUILDINGS,
  isNationResource,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";

// returns available building-owned resource in producing buildings
export function getProducingBuildings(ctx: GameCtx, nation: Nation) {
  const buildShortage: {
    hexId: number;
    buildingId: string;
    available: Partial<Record<BASE_RESOURCE, number>>;
  }[] = [];

  const hexBuildingMap = new Map(
    ctx.mapHexes.flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    const hex = hexBuildingMap.get(building.id);
    if (!hex) continue;

    const name = findBuildingNameByCategory({
      buildingCategory: building.category,
      level: building.level,
    });

    const producing: Partial<Record<BASE_RESOURCE, number>> = {};

    for (const resource of BUILDINGS[name].producing ?? []) {
      // only count building-owned resources
      if (isNationResource(resource)) continue;
      producing[resource] = calculateResourceOutput(hex, resource);
    }
    console.log(`producing at ${hex.id}`, producing);

    // exporting
    const exporting: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const c of building.contracts ?? []) {
      const existing = exporting[c.resource] ?? 0;
      const perTurn = getContractPerTurn(c);

      exporting[c.resource] = existing + perTurn;
    }
    console.log(`exporting at ${hex.id}`, exporting);

    const available: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const [resource, amount] of typedEntries(producing)) {
      const sent = exporting[resource] ?? 0;
      const produced = amount ?? 0;
      available[resource] = Math.max(0, produced - sent);
    }
    console.log(`final available in ${hex.id}:`, available);

    buildShortage.push({ hexId: hex.id, buildingId: building.id, available });
  }

  return buildShortage;
}
