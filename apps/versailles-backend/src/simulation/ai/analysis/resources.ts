import { getBuildingContractsMap } from "#simulation/contracts/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { getBuildingConfig } from "@repo/shared/buildings";
import { BASE_RESOURCE } from "@repo/shared/resources";
import { typedEntries } from "@repo/shared/utils";
import { getNationBuildings } from "../../buildings/queries.js";

// return all buildings of nation with resource shortage object
export function getBuildingsShortage(ctx: GameCtx, nation: Nation) {
  const buildShortage: {
    hexId: number;
    buildingId: string;
    shortage: Partial<Record<BASE_RESOURCE, number>>;
  }[] = [];

  const hexBuildingMap = new Map(
    ctx.mapHexes.flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );
  const contractMap = getBuildingContractsMap(ctx);

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    const hex = hexBuildingMap.get(building.id);
    if (!hex) continue;

    const config = getBuildingConfig(building);
    const needed = config?.consuming ?? {};

    const contracts = contractMap.get(building.id) ?? [];

    // incoming per turn
    const incoming: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const c of contracts) {
      if (c.toBuildingId === building.id) {
        const currIncoming = incoming[c.resource] ?? 0;
        incoming[c.resource] = currIncoming + c.amount;
      }
    }

    const shortage: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const [resource, consumingObject] of typedEntries(needed)) {
      const incomingResource = incoming[resource] ?? 0;
      const requiredResource = consumingObject?.amount ?? 0;
      shortage[resource] = Math.max(0, requiredResource - incomingResource);
    }

    buildShortage.push({ hexId: hex.id, buildingId: building.id, shortage });
  }

  return buildShortage;
}
