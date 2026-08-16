import { BASE_RESOURCE } from "#data/resources";
import {
  ContractCalculationContext,
  ContractCalculationInput,
  ContractCalculationResult,
} from "./types";

function compareContractOrder(a: ContractCalculationInput, b: ContractCalculationInput) {
  return a.order.index - b.order.index || a.contractId.localeCompare(b.contractId);
}

export function calculateContracts(
  contracts: readonly ContractCalculationInput[],
  input: ContractCalculationContext
): ContractCalculationResult[] {
  const result: ContractCalculationResult[] = [];
  const ordered = [...contracts].sort(compareContractOrder);

  const deliveredMap = new Map<string, Partial<Record<BASE_RESOURCE, number>>>();
  const remainingAvailable = new Map(
    [...input.availableByBuilding].map(([buildingId, resources]) => [buildingId, { ...resources }])
  );

  // Calculate without mutating contracts or creating actions.
  for (const contract of ordered) {
    const available = remainingAvailable.get(contract.fromBuildingId);
    const availableResource = available?.[contract.resource] ?? 0;
    if (!available) continue;

    const required = input.requiredByBuilding.get(contract.toBuildingId)?.[contract.resource] ?? 0;
    if (!required) continue;

    const delivered = deliveredMap.get(contract.toBuildingId) ?? {};
    const deliveredResource = delivered[contract.resource] ?? 0;

    if (deliveredResource >= required) continue;

    if (contract.autoAdjust) {
      const remainingRequired = Math.max(0, required - deliveredResource);
      const send = Math.max(0, Math.min(availableResource, remainingRequired));

      delivered[contract.resource] = deliveredResource + send;
      available[contract.resource] = Math.max(0, availableResource - send);

      deliveredMap.set(contract.toBuildingId, delivered);
      remainingAvailable.set(contract.fromBuildingId, available);

      result.push({ contractId: contract.contractId, calculatedAmount: send });
    } else {
      const send = Math.max(0, Math.min(availableResource, contract.amount));

      delivered[contract.resource] = deliveredResource + send;
      available[contract.resource] = Math.max(0, availableResource - send);

      deliveredMap.set(contract.toBuildingId, delivered);
      remainingAvailable.set(contract.fromBuildingId, available);
      // do not update result so non adjustable contracts stay the same
    }
  }

  return result;
}
