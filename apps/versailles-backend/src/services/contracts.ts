import {
  BASE_RESOURCE,
  baseResources,
  BUILDINGS,
  getBuilding,
  getBuildingName,
  Nation,
  ServerContractUpdate,
  startDijkstrasAlgo,
  SupplyContract,
} from "@repo/shared";
import { GameCtx, IntentInput } from "../trpc/index.js";
import { getBuildingsByIdMap } from "./buildings/queries.js";
import { pointKey } from "./road.js";

export type newContract = {
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
};

export function submitNewContracts({
  contracts,
  gameCtx,
  nation,
}: {
  contracts: newContract[];
  gameCtx: GameCtx;
  nation: Nation;
}) {
  const { mapHexes, buildings, roads } = gameCtx;

  const buildingContractMap = getBuildingContractsMap(gameCtx);

  // check whether starting building is allowed to have contracts
  for (const contract of contracts) {
    if (!baseResources.includes(contract.resource)) continue;

    const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
    const startingHex = mapHexes.find((h) => h.buildingId === contract.startBuildingId);
    const endHex = mapHexes.find((h) => h.buildingId === contract.endBuildingId);
    const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });
    if (!startBuilding || !endHex?.buildingId || !startingHex || !endHex || !endBuilding) continue;
    if (startingHex.owner !== nation.id || endHex.owner !== nation.id) continue;

    // -- VALIDATION --
    // check if building produces anything to export
    const startName = getBuildingName(startBuilding.category, startBuilding.level);

    if (!startName) continue;
    if (
      !BUILDINGS[startName].producing ||
      Object.entries(BUILDINGS[startName].producing).length === 0
    )
      continue;

    // check if destination is allowed to store that resource
    const endName = getBuildingName(endBuilding.category, endBuilding.level);
    if (!endName) continue;

    const canAccept = BUILDINGS[endName].consuming?.[contract.resource];

    if (!canAccept) continue;

    // check if these two buildings already have a contract with the same resource
    const buildingContracts = buildingContractMap.get(startBuilding.id) ?? [];

    const sameContract = buildingContracts.find(
      (c) => c.toBuildingId === endBuilding.id && c.resource === contract.resource
    );
    if (sameContract) continue;

    // --- CREATE ---
    const points = startDijkstrasAlgo({ startingHex: startingHex, endHex, mapHexes, roads });
    if (!points) continue;

    if (pointKey(points[0]) !== pointKey({ q: startingHex.q, r: startingHex.r })) continue;
    const last = points.at(-1);
    if (last && pointKey(last) !== pointKey({ q: endHex.q, r: endHex.r })) continue;

    if (!baseResources.includes(contract.resource)) continue;

    createContract(gameCtx.contracts, {
      id: crypto.randomUUID(),
      fromBuildingId: contract.startBuildingId,
      toBuildingId: contract.endBuildingId,
      amount: contract.amount,
      resource: contract.resource,
      autoAdjust: contract.autoAdjust,
      ownerId: nation.id,
    });
  }
}

export function createContract(contracts: SupplyContract[], newContract: SupplyContract) {
  contracts.push(newContract);
  return { ok: true };
}

// this function only recalculates contracts which have "autoAdjust" feature enabled
export function recalculateContractsAmounts(ctx: GameCtx) {
  const buildingHexMap = new Map(ctx.mapHexes.map((h) => [h.buildingId, h]));

  for (const contract of ctx.contracts) {
    const startHex = buildingHexMap.get(contract.fromBuildingId);
    if (!startHex || !startHex.owner) continue;

    if (!contract.autoAdjust) continue; // only recalculate with auto-adjust

    const toBuilding = getBuilding({ buildings: ctx.buildings, id: contract.toBuildingId });
    if (!toBuilding) continue;

    {
      /*const amount = calculateExportAmount({
      startBuilding: building,
      endBuilding,
      length: path.length - 1,
      resource: contract.resource,
      mapHexes: ctx.mapHexes,
      buildings: ctx.buildings,
    }); 

    if (!amount) continue;

    contract.amount = amount; */
    }
  }
}

export function updateContracts(
  ctx: GameCtx,
  updateIntent: ServerContractUpdate[],
  nation: Nation
) {
  const contractMap = getContractIdMap(ctx);

  for (const contractUpdate of updateIntent) {
    if (contractUpdate.changes.resource && !baseResources.includes(contractUpdate.changes.resource))
      continue;
    const contract = contractMap.get(contractUpdate.contractId);
    if (!contract) continue;

    if (contract.ownerId !== nation.id) continue;

    // update contract
    Object.assign(contract, contractUpdate.changes, {
      progress: 0,
    });
  }
}

export function submitDeleteContracts(
  ctx: GameCtx,
  deleteContracts: IntentInput["deleteContracts"],
  nation: Nation
) {
  const contractIdMap = getContractIdMap(ctx);

  for (const contractId of deleteContracts) {
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
