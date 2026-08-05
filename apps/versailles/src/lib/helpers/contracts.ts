import { BASE_RESOURCE, Building, getBuildingConfig } from "@repo/shared";
import { MergedContract } from "../types/game";

export function getContractResourceMap(contracts: MergedContract[]) {
  const map = new Map<BASE_RESOURCE, MergedContract[]>();

  for (const contract of contracts) {
    const existing = map.get(contract.resource) ?? [];

    map.set(contract.resource, [...existing, contract]);
  }

  return map;
}

export function calcResourceExport(
  toBuilding: Building,
  resource: BASE_RESOURCE,
  mergedContracts: MergedContract[]
) {
  const importing = mergedContracts
    .filter((c) => c.endBuildingId === toBuilding.id && c.resource === resource)
    .reduce((acc, c) => acc + c.amount, 0);

  const config = getBuildingConfig(toBuilding);
  const required = config?.consuming?.[resource]?.amount ?? 0;

  const needed = Math.max(0, required - importing);

  return needed;
}
