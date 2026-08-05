import {
  MergedContractChanges,
  ServerContractUpdate,
  SupplyContract,
} from "@repo/shared/data/contracts";
import { useIntentStore } from "../../stores/intentStore";
import { Contract, MergedContract, ServerContract } from "../../types/game";
import { Building, BUILDINGS } from "@repo/shared/data/buildings";
import { BASE_RESOURCE, getBuildingName, isBaseResource, typedEntries } from "@repo/shared";

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

// turn raw server contracts into canonical MergedContract
export function mergeServerContracts(contracts: SupplyContract[]) {
  const serverContractDelete = useIntentStore.getState().serverContractDelete;
  const deletedCotractsSet = new Set<string>(serverContractDelete);

  return contracts
    .filter((c) => !deletedCotractsSet.has(c.id))
    .map((contract) => ({
      id: contract.id,
      startBuildingId: contract.fromBuildingId,
      endBuildingId: contract.toBuildingId,
      amount: contract.amount,
      resource: contract.resource,
      autoAdjust: contract.autoAdjust,
      fromServer: true,
    })) as MergedContract[];
}

export function mergeClientContracts(contracts: Contract[]): MergedContract[] {
  return contracts.map((c) => ({
    ...c,
    fromServer: false,
  }));
}

// takes raw server and client contract data and merges them into one ui list
export function getMergedContracts(
  serverContracts: SupplyContract[],
  clientContracts: Contract[],
  buildingId: string,
  serverContractUpdate: ServerContractUpdate[]
) {
  // Step 1: filter both by building id
  const updServerContracts = serverContracts.filter((c) => c.fromBuildingId === buildingId);
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
      startBuildingId: c.startBuildingId, // start building - passed from props
      endBuildingId: c.endBuildingId, // end building - get from contract
      amount: c.amount,
      autoAdjust: c.autoAdjust,
      resource: c.resource,
      fromServer: true,
      ownerId: c.ownerId,
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
  const startName = getBuildingName(startBuilding.category, startBuilding.level);
  if (!startName) return;

  const takenResources = new Set<BASE_RESOURCE>(
    allContracts
      .filter((c) => c.startBuildingId === startBuilding.id && c.endBuildingId === endBuilding.id)
      .map((c) => c.resource)
  );

  // get first available
  const producing = BUILDINGS[startName].producing;
  if (!producing) return;
  const availableResource = typedEntries(producing).find(
    ([r, amount]) => (amount ?? 0) > 0 && isBaseResource(r) && !takenResources.has(r)
  )?.[0];
  if (!availableResource || !isBaseResource(availableResource)) return;
  return availableResource;
}

export function deleteServerContract(id: string) {
  const setServerContractDelete = useIntentStore.getState().setServerContractDelete;

  setServerContractDelete((prev) => {
    const existing = prev.find((prevId) => prevId === id);

    if (!existing) {
      return [...prev, id];
    }
    return prev;
  });
}

export function deleteClientContract(id: string) {
  const setContracts = useIntentStore.getState().setContracts;

  setContracts((prev) => {
    return prev.filter((c) => c.id !== id);
  });
}
