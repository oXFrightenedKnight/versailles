import {
  Building,
  BUILDINGS,
  findBuildingNameByCategory,
  RESOURCES,
  SupplyContract,
} from "@repo/shared";
import { MergedContractChanges, ServerContractUpdate, useIntentStore } from "../intentStore";
import { Contract, MergedContract, ServerContract } from "../types/game";

// function that automatically updates contractUpdateIntent in intentStore
export function updateServerContractIntent(contractId: string, newChanges: MergedContractChanges) {
  const setServerContractUpdate = useIntentStore.getState().setServerContractUpdate;
  setServerContractUpdate((prev) => {
    const existing = prev.find((c) => c.contractId === contractId);

    if (!existing) {
      return [
        ...prev,
        {
          contractId: contractId,
          changes: newChanges,
        },
      ];
    }

    return prev.map((c) =>
      c.contractId === contractId
        ? {
            ...c,
            changes: {
              ...c.changes,
              ...newChanges,
            },
          }
        : c
    );
  });
}

// turn raw server contracts into canonical mergedContract
export function mergeServerContracts(contractObj: ServerContract) {
  const { contracts, buildingId } = contractObj;
  return contracts.map((contract) => ({
    id: contract.id,
    hexIds: contract.hexIds,
    startBuildingId: buildingId,
    endBuildingId: contract.buildingId,
    amount: contract.amount,
    progress: contract.progress,
    resource: contract.resource,
    autoAdjust: contract.autoAdjust,
    fromServer: true,
  })) as MergedContract[];
}

export function getServerContractsFromBuildings(buildings: Building[]) {
  return buildings
    .filter((b) => b.contracts)
    .map((b) => ({
      buildingId: b.id,
      contracts: b.contracts!,
    }));
}

export function mergeClientContracts(contracts: Contract[]) {
  return contracts.map((c) => ({
    ...c,
    fromServer: false,
  })) as MergedContract[];
}

// takes raw server and client contract data and merges them into one ui list
export function getMergedContracts(
  serverContracts: ServerContract[],
  clientContracts: Contract[],
  buildingId: string,
  serverContractUpdate: ServerContractUpdate[]
) {
  // Step 1: filter both by building id
  const updServerContracts = serverContracts.find((c) => c.buildingId === buildingId);
  const updClientContracts = clientContracts.filter((c) => c.startBuildingId === buildingId);

  // Step 2: get merged server and client contracts
  const mergedServer = updServerContracts ? mergeServerContracts(updServerContracts) : [];
  const mergedClient = mergeClientContracts(updClientContracts);

  // merge-in intent server changes
  const updateMap = new Map<string, MergedContractChanges>(
    serverContractUpdate.map((c) => [c.contractId, c.changes])
  );
  const mappedServerContracts: MergedContract[] = mergedServer.map((c) => {
    const updateIntent = updateMap.get(c.id);
    return {
      id: c.id,
      hexIds: c.hexIds,
      startBuildingId: c.startBuildingId, // start building - passed from props
      endBuildingId: c.endBuildingId, // end building - get from contract
      amount: c.amount,
      autoAdjust: c.autoAdjust,
      resource: c.resource,
      progress: c.progress,
      fromServer: true,
      ...updateIntent,
    };
  });

  return [...mappedServerContracts, ...mergedClient];
}

export function getFirstFreeResource({
  startBuilding,
  endBuilding,
  allContracts,
}: {
  startBuilding: Building;
  endBuilding: Building;
  allContracts: MergedContract[];
}) {
  const startName = findBuildingNameByCategory({
    buildingCategory: startBuilding.category,
    level: startBuilding.level,
  });
  if (!startName) return;

  const takenResources = new Set<RESOURCES>(
    allContracts
      .filter((c) => c.startBuildingId === startBuilding.id && c.endBuildingId === endBuilding.id)
      .map((c) => c.resource)
  );

  // get first available
  const producing = BUILDINGS[startName].producing;
  if (!producing) return;
  const availableResource = producing.find((r) => !takenResources.has(r));
  if (!availableResource) return;
  return availableResource;
}
