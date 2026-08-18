import {
  Building,
  calculateContracts,
  ContractCalculationInput,
  getAvailableByBuildingMap,
  getRequiredByBuildingMap,
  SupplyContract,
} from "@repo/shared";
import { ContractPrediction } from "./types";
import { ContractProjection } from "../../mergeData/contracts/types";
import { PendingAction } from "@/lib/types/actions";
import { selectContracts } from "../../mergeData/contracts/selectors";

export function selectContractPredictions(
  serverContracts: SupplyContract[],
  buildings: Building[],
  pendingActions: PendingAction[]
): ContractPrediction[] {
  const projections = selectContracts(serverContracts, pendingActions);

  const availableByBuilding = getAvailableByBuildingMap(buildings);
  const requiredByBuilding = getRequiredByBuildingMap(buildings);
  const contractInput = projectionToContractInput(projections);

  const { result, blocked } = calculateContracts(contractInput, {
    availableByBuilding,
    requiredByBuilding,
  });
  const resultMap = new Map(result.map((c) => [c.contractId, c.calculatedAmount]));

  return [...projections].map((c) => {
    const newAmount = resultMap.get(c.contractId) ?? c.amount;
    const isBlocked = blocked.has(c.contractId);

    return { ...c, amount: newAmount, blocked: isBlocked };
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
