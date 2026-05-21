import { baseConsumeRate, Building, BUILDINGS } from "#data/buildings";
import { SupplyContract } from "#data/contracts";
import { Hex, RESOURCES } from "#data/hex_map";
import { findBuildingNameByCategory } from "./buildings";

// estimates consumption of every resource this building can accept
export function estimateConsumption({
  building,
  mapHexes,
}: {
  building: Building;
  mapHexes: Hex[];
}) {
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;

  const consumedResources = BUILDINGS[name].consumptionMod;

  const estConsumption = new Map<string, number>();
  for (const [resource, modifier] of Object.entries(consumedResources)) {
    const consumptionAmount = Math.round(hex.population * modifier * baseConsumeRate);

    estConsumption.set(resource, consumptionAmount);
  }

  return Object.fromEntries(estConsumption);
}

// calculates how much a building should export based on road length, amount, etc.
export function calculateExportAmount({
  startBuilding,
  endBuilding,
  length,
  resource,
  mapHexes,
  buildings,
}: {
  startBuilding: Building;
  endBuilding: Building;
  length: number;
  resource: RESOURCES;
  mapHexes: Hex[];
  buildings: Building[];
}) {
  const consumptionPerTurn = estimateConsumption({ building: endBuilding, mapHexes });
  if (!consumptionPerTurn) return;

  // find other contracts that are exporting this resource to this building
  const contracts = new Set<SupplyContract>();
  for (const building of buildings) {
    // make sure to filter out building that currently owns this contract to
    // get actual export amount and not delta
    if (!building.contracts || building === startBuilding) continue;
    for (const contract of building.contracts) {
      contracts.add(contract);
    }
  }

  const sameExports = [...contracts].filter(
    (c) => c.buildingId === endBuilding.id && c.resource === resource
  );
  let totalExportAmount = 0; // export amount per turn
  for (const contract of sameExports) {
    totalExportAmount += contract.amount / (contract.hexIds.length - 1);
  }

  const neededForExport = consumptionPerTurn[resource]
    ? consumptionPerTurn[resource] - totalExportAmount
    : 0;
  const totalNeededExport = neededForExport * length;
  if (neededForExport > 0) {
    console.log(`totalNeededForExport of ${resource}`, totalNeededExport);
    return totalNeededExport;
  }
}
