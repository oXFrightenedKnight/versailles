import { GameCtx } from "#trpc";
import { SupplyContract } from "@repo/shared";
import { getBuildingsByIdMap } from "@repo/shared/buildings";
import { BASE_RESOURCE } from "@repo/shared/resources";

// returns true if a two buildings have at least 1 contract of specified resource
export function hasContract(
  ctx: GameCtx,
  fromBuildingId: string,
  toBuildingId: string,
  resource: BASE_RESOURCE
) {
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);

  const fromBuilding = buildingIdMap.get(fromBuildingId);
  const toBuilding = buildingIdMap.get(toBuildingId);

  const buildingContracts = getBuildingContracts(ctx, fromBuildingId);

  if (!fromBuilding || !toBuilding || !buildingContracts) return false;

  if (buildingContracts.find((c) => c.toBuildingId === toBuildingId && c.resource === resource))
    return true;

  return false;
}

export function getBuildingContracts(
  { contracts }: { contracts: SupplyContract[] },
  buildingId: string
) {
  return contracts.filter((c) => c.fromBuildingId === buildingId);
}

export function getContractBuilding(ctx: GameCtx, contractId: string) {
  const contract = ctx.contracts.find((c) => c.id === contractId);
  if (!contract) return null;

  return ctx.buildings.find((b) => b.id === contract.fromBuildingId) ?? null;
}

export function getContractIdMap({ contracts }: { contracts: SupplyContract[] }) {
  return new Map(contracts.map((c) => [c.id, c]));
}

export function getBuildingContractsMap(ctx: GameCtx) {
  const map = new Map<string, SupplyContract[]>();
  for (const contract of ctx.contracts) {
    const prev = map.get(contract.fromBuildingId) ?? [];

    map.set(contract.fromBuildingId, [...prev, contract]);
  }

  return map;
}

export function getContractsToBuilding({ contracts }: { contracts: SupplyContract[] }) {
  return new Map(contracts.map((c) => [c.toBuildingId, c]));
}
