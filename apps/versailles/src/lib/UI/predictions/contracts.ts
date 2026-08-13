import {
  Building,
  calculateContracts,
  ContractCalculationInput,
  getAvailableByBuildingMap,
  getRequiredByBuildingMap,
} from "@repo/shared";
import { ContractProjection } from "../mergeData/contracts/types";

export function selectContractPredictions(contracts: ContractProjection[], buildings: Building[]) {
  const availableByBuilding = getAvailableByBuildingMap(buildings);
  const requiredByBuilding = getRequiredByBuildingMap(buildings);
  const contractInput = projectionToContractInput(contracts);

  const resultMap = new Map(
    calculateContracts(contractInput, { availableByBuilding, requiredByBuilding }).map((c) => [
      c.contractId,
      c.calculatedAmount,
    ])
  );

  return [...contracts].map((c) => {
    const updatedAmount = resultMap.get(c.contractId);
    if (!updatedAmount) return c;

    return { ...c, amount: updatedAmount };
  });
}

export function projectionToContractInput(
  projections: ContractProjection[]
): ContractCalculationInput[] {
  return projections.map((p) => ({
    contractId: p.contractId,
    order: {
      group: p.source === "server" ? "confirmed" : "pending",
      index: p.executionOrder,
    },

    fromBuildingId: p.fromBuildingId,
    toBuildingId: p.toBuildingId,
    amount: p.amount,
    resource: p.resource,
    autoAdjust: p.autoAdjust,
  }));
}
