import { Building } from "@repo/shared";
import { getBuildingsByIdMap, getBuildingConfig } from "@repo/shared/buildings";
import { getAvailableResources } from "@repo/shared/contracts";
import { BASE_RESOURCE } from "@repo/shared/resources";
import { ContractProjection } from "../UI/mergeData/contracts/types";
import { ContractPrediction } from "../UI/predictions/contracts/types";

export function getOptimisticImportedResources(
  contracts: ContractPrediction[],
  toBuildingId?: string
) {
  const map = new Map<BASE_RESOURCE, number>();
  for (const contract of contracts) {
    if (contract.blocked) continue;
    if (toBuildingId && toBuildingId !== contract.toBuildingId) continue;
    const currImported = map.get(contract.resource) ?? 0;

    map.set(contract.resource, currImported + contract.amount);
  }

  return map;
}

export function getOptimisticExportedResources(
  contracts: ContractPrediction[],
  fromBuildingId?: string
) {
  const map = new Map<BASE_RESOURCE, number>();
  for (const contract of contracts) {
    if (contract.blocked) continue;
    if (fromBuildingId && fromBuildingId !== contract.fromBuildingId) continue;
    const currExported = map.get(contract.resource) ?? 0;

    map.set(contract.resource, currExported + contract.amount);
  }

  return map;
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
    // set currently selected resource as available
    availableResources.add(contract.resource);

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
