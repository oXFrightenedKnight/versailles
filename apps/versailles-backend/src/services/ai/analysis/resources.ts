import { getNationBuildings } from "#services/buildings/queries.js";
import { getContractPerTurn } from "#services/contracts.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, BASE_RESOURCE, SupplyContract, estimateConsumption } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";

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
  const contractMap = new Map<string, SupplyContract[]>();

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    if (!building.contracts) continue;

    for (const contract of building.contracts) {
      const existing = contractMap.get(contract.buildingId) ?? [];

      contractMap.set(contract.buildingId, [...existing, contract]);
    }
  }

  for (const building of nationBuildings) {
    const hex = hexBuildingMap.get(building.id);
    if (!hex) continue;

    const required = estimateConsumption({ building, mapHexes: ctx.mapHexes });
    if (!required) continue;

    const contracts = contractMap.get(building.id) ?? [];

    // incoming per turn
    const incoming: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const c of contracts) {
      const existing = incoming[c.resource] ?? 0;
      const perTurn = getContractPerTurn(c);

      incoming[c.resource] = existing + perTurn;
    }

    const shortage: Partial<Record<BASE_RESOURCE, number>> = {};
    for (const [resource, amount] of typedEntries(required)) {
      const incomingResource = incoming[resource] ?? 0;
      const requiredResource = amount ?? 0;
      shortage[resource] = Math.max(0, requiredResource - incomingResource);
    }

    buildShortage.push({ hexId: hex.id, buildingId: building.id, shortage });
  }

  return buildShortage;
}
