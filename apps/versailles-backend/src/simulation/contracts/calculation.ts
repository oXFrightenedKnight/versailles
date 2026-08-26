import { updateContract } from "#simulation/contracts/mutations";
import { GameCtx } from "#trpc";
import { SupplyContract, Building } from "@repo/shared";
import { getAvailableByBuildingMap, getRequiredByBuildingMap } from "@repo/shared/buildings";
import { ContractCalculationInput, calculateContracts } from "@repo/shared/contracts";

// recalculates contracts which have "autoAdjust" feature enabled
export function recalculateContractsAmounts(ctx: GameCtx) {
  const { result } = getContractCalculation(ctx.contracts, ctx.buildings);

  for (const { contractId, calculatedAmount } of result) {
    updateContract(ctx, contractId, { amount: calculatedAmount });
  }
}

export function convertContractInput(contracts: SupplyContract[]): ContractCalculationInput[] {
  return contracts.map((c) => ({
    contractId: c.id,
    order: {
      group: "confirmed",
      index: c.executionOrder,
    },
    fromBuildingId: c.fromBuildingId,
    toBuildingId: c.toBuildingId,
    amount: c.amount,
    resource: c.resource,
    autoAdjust: c.autoAdjust,
  }));
}

export function getContractCalculation(contracts: SupplyContract[], buildings: Building[]) {
  const availableByBuilding = getAvailableByBuildingMap(buildings);
  const requiredByBuilding = getRequiredByBuildingMap(buildings);

  const converted = convertContractInput(contracts);

  return calculateContracts(converted, { availableByBuilding, requiredByBuilding });
}
