import {
  BASE_RESOURCE,
  baseResources,
  Building,
  getAvailableResources,
  getBuildingConfig,
  getBuildingsByIdMap,
} from "@repo/shared";
import { MergedContract } from "../types/game";
import { ContractProjection } from "../UI/mergeData/contracts/types";

export function getOptimisticImportedResources(contracts: ContractProjection[]) {
  const map = new Map<BASE_RESOURCE, number>();
  for (const contract of contracts) {
    const currImported = map.get(contract.resource) ?? 0;

    map.set(contract.resource, currImported + contract.amount);
  }

  return map;
}

export function calcResourceExport(
  toBuilding: Building,
  resource: BASE_RESOURCE,
  mergedContracts: MergedContract[]
) {
  const importing = mergedContracts
    .filter((c) => c.endBuildingId === toBuilding.id && c.resource === resource)
    .reduce((acc, c) => acc + c.amount, 0);

  const config = getBuildingConfig(toBuilding);
  const required = config?.consuming?.[resource]?.amount ?? 0;

  const needed = Math.max(0, required - importing);

  return needed;
}

export function getAvailableResourcesByContract(
  contracts: ContractProjection[],
  buildings: Building[]
) {
  const resourcesByContract = new Map<string, Set<BASE_RESOURCE>>();
  const buildingIdMap = getBuildingsByIdMap(buildings);

  const buildingContractMap = new Map<string, ContractProjection[]>();
  for (const contract of contracts) {
    const existing = buildingContractMap.get(contract.fromBuildingId) ?? [];
    buildingContractMap.set(contract.fromBuildingId, [...existing, contract]);
  }

  for (const contract of contracts) {
    const startBuilding = buildingIdMap.get(contract.fromBuildingId);
    const endBuilding = buildingIdMap.get(contract.toBuildingId);

    if (!startBuilding || !endBuilding) continue;

    const startConfig = getBuildingConfig(startBuilding);
    const endConfig = getBuildingConfig(endBuilding);
    if (!startConfig || !endConfig) continue;

    const buildingContracts = buildingContractMap.get(startBuilding.id) ?? [];
    const exportingResources = getExportedResourcesToBuilding(
      buildingContracts,
      startBuilding.id,
      endBuilding.id
    );

    const availableResources = getAvailableResources(
      [...exportingResources],
      startConfig.producing ?? {},
      endConfig.consuming ?? {}
    );

    resourcesByContract.set(contract.contractId, availableResources);
  }

  return resourcesByContract;
}

// returns a set of all resources transferred between two buildings
export function getExportedResourcesToBuilding(
  contracts: ContractProjection[],
  fromBuildingId: string,
  toBuildingId: string
) {
  const eligibleContracts = contracts.filter(
    (c) => c.fromBuildingId === fromBuildingId && c.toBuildingId === toBuildingId
  );
  return new Set(eligibleContracts.map((c) => c.resource));
}
