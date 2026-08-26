import { checkIsDecimal } from "#lib/helpers";
import { createContract, updateContract, deleteContract } from "#simulation/contracts/mutations";
import { updateContractOrderIdx } from "#simulation/contracts/ordering";
import { getBuildingContractsMap, getContractIdMap } from "#simulation/contracts/queries";
import { pointKey } from "#simulation/roads/geometry";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";
import { getBuilding, getBuildingConfig } from "@repo/shared/buildings";
import { getAvailableResources } from "@repo/shared/contracts";
import { startDijkstrasAlgo } from "@repo/shared/map";
import { baseResources } from "@repo/shared/resources";

export function submitNewContracts(
  ctx: GameCtx,
  nation: Nation,
  createContracts: ActionOfType<"contract.create">[]
) {
  const { mapHexes, buildings, roads } = ctx;

  const buildingContractMap = getBuildingContractsMap(ctx);

  const contractIds = new Set(ctx.contracts.map((c) => c.id));

  // check whether starting building is allowed to have contracts
  for (const action of createContracts) {
    if (contractIds.has(action.contractId)) continue;

    if (!baseResources.includes(action.resource)) continue;

    const startBuilding = getBuilding({ buildings, id: action.startBuildingId });
    const startingHex = mapHexes.find((h) => h.buildingId === action.startBuildingId);

    const endHex = mapHexes.find((h) => h.buildingId === action.endBuildingId);
    const endBuilding = getBuilding({ buildings, id: action.endBuildingId });

    if (!startBuilding || !endHex?.buildingId || !startingHex || !endHex || !endBuilding) continue;
    if (startingHex.owner !== nation.id || endHex.owner !== nation.id) continue;

    // -- VALIDATION --
    // check if building produces anything to export
    const startConfig = getBuildingConfig(startBuilding);
    const endConfig = getBuildingConfig(endBuilding);

    const startProduction = startConfig?.producing ?? {};
    const endConsumption = endConfig?.consuming ?? {};

    // check if these two buildings already have a contract with the same resource
    const buildingContracts = buildingContractMap.get(startBuilding.id) ?? [];
    const exportedResources = new Set(
      buildingContracts.flatMap((c) => (c.toBuildingId === endBuilding.id ? [c.resource] : []))
    );

    const availableResources = getAvailableResources(
      [...exportedResources],
      startProduction,
      endConsumption
    );
    if (!availableResources.has(action.resource)) continue;

    // check for decimal
    const isDecimal = checkIsDecimal(action.amount);
    if (isDecimal) continue;

    // --- CREATE ---
    const points = startDijkstrasAlgo({ startingHex: startingHex, endHex, mapHexes, roads });
    if (!points) continue;

    if (pointKey(points[0]) !== pointKey({ q: startingHex.q, r: startingHex.r })) continue;
    const last = points.at(-1);
    if (last && pointKey(last) !== pointKey({ q: endHex.q, r: endHex.r })) continue;

    createContract(ctx.contracts, {
      id: action.contractId,
      fromBuildingId: action.startBuildingId,
      toBuildingId: action.endBuildingId,
      amount: action.amount,
      resource: action.resource,
      autoAdjust: action.autoAdjust,
      ownerId: nation.id,
      executionOrder: ctx.counters.nextContractExecutionOrder,
    });
    updateContractOrderIdx(ctx);
    contractIds.add(action.contractId);
  }
}

export function updateContracts(
  ctx: GameCtx,
  updateActions: ActionOfType<"contract.update">[],
  nation: Nation
) {
  const contractMap = getContractIdMap(ctx);

  for (const contractUpdate of updateActions) {
    if (contractUpdate.changes.resource && !baseResources.includes(contractUpdate.changes.resource))
      continue;
    const contract = contractMap.get(contractUpdate.contractId);
    if (!contract) continue;

    if (contract.ownerId !== nation.id) continue;

    const amount = contractUpdate.changes.amount;
    if (amount) {
      const isDecimal = checkIsDecimal(amount);
      if (isDecimal) continue;
    }

    updateContract(ctx, contract.id, { ...contractUpdate.changes });
  }
}

export function submitDeleteContracts(
  ctx: GameCtx,
  deleteActions: ActionOfType<"contract.delete">[],
  nation: Nation
) {
  const contractIdMap = getContractIdMap(ctx);

  for (const { contractId } of deleteActions) {
    const contract = contractIdMap.get(contractId);
    if (!contract || contract.ownerId !== nation.id) continue;

    deleteContract(ctx, contract.id);
  }
}
