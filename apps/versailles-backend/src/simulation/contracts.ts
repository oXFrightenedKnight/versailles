import {
  ActionOfType,
  BASE_RESOURCE,
  baseResources,
  Building,
  calculateContracts,
  ContractCalculationInput,
  getAvailableByBuildingMap,
  getAvailableResources,
  getBuilding,
  getBuildingConfig,
  getBuildingsByIdMap,
  getRequiredByBuildingMap,
  Nation,
  startDijkstrasAlgo,
  SupplyContract,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { pointKey } from "./road.js";
import { checkIsDecimal } from "#lib/helpers.js";

export type newContract = {
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
};

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

export function createContract(contracts: SupplyContract[], newContract: SupplyContract) {
  contracts.push(newContract);
  return { ok: true };
}

export function updateContract(ctx: GameCtx, contractId: string, changes: Partial<SupplyContract>) {
  ctx.contracts = ctx.contracts.map((contract) =>
    contract.id === contractId ? { ...contract, ...changes } : contract
  );

  return { ok: true };
}

// recalculates contracts which have "autoAdjust" feature enabled
export function recalculateContractsAmounts(ctx: GameCtx) {
  const { result } = getContractCalculation(ctx.contracts, ctx.buildings);

  for (const { contractId, calculatedAmount } of result) {
    updateContract(ctx, contractId, { amount: calculatedAmount });
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

// cancel army training by the object id
export function deleteContract({ contracts }: { contracts: SupplyContract[] }, contractId: string) {
  contracts = contracts.filter((c) => c.id !== contractId);

  return { ok: true };
}

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

export function sortContracts(contracts: SupplyContract[]) {
  return contracts.sort((a, b) => a.executionOrder - b.executionOrder || a.id.localeCompare(b.id));
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

export function updateContractOrderIdx(ctx: GameCtx) {
  ctx.counters.nextContractExecutionOrder++;
}
