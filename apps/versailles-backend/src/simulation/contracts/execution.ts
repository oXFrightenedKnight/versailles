import { SupplyContract, Building } from "@repo/shared";
import { getAvailableByBuildingMap } from "@repo/shared/buildings";
import { BASE_RESOURCE } from "@repo/shared/resources";

// strict executor that either executes contracts or rejects them
export function runContractExecutor(contracts: SupplyContract[], buildings: Building[]) {
  const availableByBuilding = getAvailableByBuildingMap(buildings);

  const deilvered = new Map<string, Partial<Record<BASE_RESOURCE, number>>>();
  const blocked = new Set<string>();

  for (const contract of contracts) {
    const available = availableByBuilding.get(contract.fromBuildingId);
    const availableResource = available?.[contract.resource];

    if (!available || availableResource === undefined || availableResource < contract.amount) {
      blocked.add(contract.id);
      continue;
    }

    const deliveredStorage = deilvered.get(contract.toBuildingId) ?? {};
    const deliveredResource = deliveredStorage?.[contract.resource] ?? 0;

    deliveredStorage[contract.resource] = Math.max(0, deliveredResource + contract.amount);
    available[contract.resource] = availableResource - contract.amount;

    deilvered.set(contract.toBuildingId, deliveredStorage);
    availableByBuilding.set(contract.fromBuildingId, available);
  }

  return deilvered;
}
