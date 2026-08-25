import { runBuildingTraining } from "../army/training.js";
import { calculatePopulationChange } from "../map.js";
import { adjustNationResource, calculateResourceOutput } from "../resources/production.js";
import { GameCtx } from "#trpc/index.js";
import {
  BASE_RESOURCE,
  Building,
  BUILDINGS,
  getBuildingName,
  isBaseResource,
  isNationResource,
  Nation,
  PRODUCIBLE_RESOURCE,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { calculateEfficiency } from "./consumption";
import { getContractCalculation, runContractExecutor } from "../contracts.js";
import { getBuildingHexMap } from "./queries";

// calculates building efficiency and updates production/available resources
export function runBuildingsSystem(gameCtx: GameCtx) {
  // map over every contract and create a map of available resources allocated to each building
  const received = runContractExecutor(gameCtx.contracts, gameCtx.buildings);

  const nationMap = new Map(gameCtx.nations.map((n) => [n.id, n]));
  const buildingHexMap = getBuildingHexMap(gameCtx);

  for (const building of gameCtx.buildings) {
    const recievedResources = received.get(building.id) ?? {};

    const hex = buildingHexMap.get(building.id);
    if (!hex) continue;

    const owner = hex.owner ? nationMap.get(hex.owner) : undefined;
    if (!owner) continue;

    const efficiency = calculateEfficiency(building, recievedResources);

    // update population based on efficiency
    calculatePopulationChange(hex, gameCtx, efficiency);

    // calculate army training
    runBuildingTraining(gameCtx, building, hex, efficiency);

    // produce/update producing building resources
    runBuildingProduction(building, owner, efficiency);
  }
}

// updates available building resource and adds its produced nation resources to owner
export function runBuildingProduction(building: Building, nation: Nation, efficiency: number) {
  const buildingName = getBuildingName(building.category, building.level);
  if (!buildingName) return;

  const availableResources = BUILDINGS[buildingName].producing ?? {};

  for (const [resource, _] of typedEntries(availableResources)) {
    const produced = calculateResourceOutput(resource, buildingName, efficiency);

    if (isBaseResource(resource)) {
      building.availableResources[resource] = produced;
    } else if (isNationResource(resource)) {
      adjustNationResource(nation, resource, produced);
      addProductionStat(building, resource, produced);
    }
  }
}

// allocate available resource from buildings. contracts that were created earlier get fulfilled first
export function calcAllocatedContractResources(ctx: GameCtx) {
  const availableResources = new Map(ctx.buildings.map((b) => [b.id, b.availableResources]));
  const allocatedResources = new Map<string, Partial<Record<BASE_RESOURCE, number>>>(); // <buildingId, Record<BASE_RESOURCE, amount>>

  for (const contract of ctx.contracts) {
    const allocatedResource = allocatedResources.get(contract.toBuildingId) ?? {};
    const prevAllocated = allocatedResource[contract.resource] ?? 0;

    // update available resource in original building
    const available = availableResources.get(contract.fromBuildingId) ?? {};
    const avialableAmount = available[contract.resource] ?? 0;

    const allocated = Math.min(avialableAmount, contract.amount);
    allocatedResource[contract.resource] = prevAllocated + allocated;
    available[contract.resource] = Math.max(0, avialableAmount - allocated);

    allocatedResources.set(contract.toBuildingId, allocatedResource);
  }

  return allocatedResources;
}

export function addProductionStat(
  building: Building,
  resource: PRODUCIBLE_RESOURCE,
  amount: number
) {
  const producedMap = new Map(building.statistics.produced.map((p) => [p.resource, p]));

  const objRef = producedMap.get(resource);
  if (!objRef) {
    building.statistics.produced.push({ amount, resource });
  } else {
    objRef.amount += amount;
  }
}
