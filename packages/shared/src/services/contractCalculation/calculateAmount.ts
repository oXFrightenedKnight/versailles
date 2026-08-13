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

  // Calculate without mutating contracts or creating actions.
  for (const contract of ordered) {
    const available = input.availableByBuilding.get(contract.fromBuildingId)?.[contract.resource];
    if (!available) continue;

    const required = input.requiredByBuilding.get(contract.toBuildingId)?.[contract.resource] ?? 0;
    if (!required) continue;

    const delivered = deliveredMap.get(contract.toBuildingId) ?? {};
    const deliveredResource = delivered[contract.resource] ?? 0;

    if (deliveredResource >= required) continue;

    if (contract.autoAdjust) {
      const send = Math.max(0, Math.min(available, required));

      delivered[contract.resource] = deliveredResource + send;

      deliveredMap.set(contract.toBuildingId, delivered);
      result.push({ contractId: contract.contractId, calculatedAmount: send });
    } else {
      const send = Math.max(0, Math.min(available, contract.amount));

      delivered[contract.resource] = deliveredResource + send;
      deliveredMap.set(contract.toBuildingId, delivered);
      // do not update result so non adjustable contracts stay the same
    }
  }

  return result;
}
