import {
  Building,
  BUILDINGS,
  EXPORTING_CATEGORIES,
  findBuildingNameByCategory,
  getBuilding,
  getHexByAxial,
  Hex,
  resources,
  RESOURCES,
  Road,
  startDijkstrasAlgo,
} from "@repo/shared";

export function createContracts({
  contracts,
  buildings,
  mapHexes,
  roads,
}: {
  contracts: {
    startBuildingId: string;
    endBuildingId: string;
    amount: number;
    resource: RESOURCES;
  }[];
  buildings: Building[];
  mapHexes: Hex[];
  roads: Road[];
}) {
  // check whether starting building is allowed to have contracts
  for (const contract of contracts) {
    const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
    const startingHex = mapHexes.find((h) => h.buildingId === contract.startBuildingId);
    const endHex = mapHexes.find((h) => h.buildingId === contract.endBuildingId);
    if (!startBuilding || !endHex?.buildingId || !startingHex || !endHex) continue;

    if (!EXPORTING_CATEGORIES.includes(startBuilding.category)) continue;

    const prevContracts = startBuilding.contracts ?? [];
    const points = startDijkstrasAlgo({ startingHex: startingHex, endHex, mapHexes, roads });
    if (!points) continue;
    // turn axial array into hex id array
    const hexIds = points
      .map((p) => {
        const h = getHexByAxial(p.q, p.r, mapHexes);

        return h?.id;
      })
      .filter((id) => id !== undefined);
    const name = findBuildingNameByCategory({
      buildingCategory: startBuilding.category,
      level: startBuilding.level,
    });

    // allow amounts that are not higher than maximum storage of building for now
    if (!resources.includes(contract.resource)) continue;
    if (contract.amount > (BUILDINGS[name].storageCap[contract.resource] ?? 0)) continue;

    startBuilding.contracts = [
      ...prevContracts,
      {
        hexIds,
        buildingId: endHex.buildingId,
        amount: contract.amount,
        resource: contract.resource,
        progress: 0,
      },
    ];
  }
}
export function executeContracts({ buildings }: { buildings: Building[] }) {
  // find all buildings with contracts
  const contractBuildings = buildings.filter((b) => b.contracts);

  for (const startBuilding of contractBuildings) {
    // add progress to existing contracts
    if (!startBuilding.contracts) continue;
    for (const contract of startBuilding.contracts) {
      const dist = contract.hexIds.length - 1;
      contract.progress += 1 / dist;

      if (contract.progress >= 1) {
        const endBuilding = getBuilding({ buildings, id: contract.buildingId });
        if (!endBuilding) continue;

        const startResourceStore = startBuilding.storage?.find((s) => s.type === contract.resource);
        const endResourceStore = endBuilding.storage?.find((s) => s.type === contract.resource);
        if (!endResourceStore || !startResourceStore) continue;

        const amount = Math.min(startResourceStore.amount, contract.amount);
        startResourceStore.amount -= amount;
        endResourceStore.amount += amount;

        contract.progress = 0;
      }
    }
  }
}

export function recalculateContracts({
  buildings,
  roads,
  mapHexes,
}: {
  buildings: Building[];
  roads: Road[];
  mapHexes: Hex[];
}) {
  // recalculate every contract to see if shorter path is available
  const buildingHexMap = new Map(mapHexes.map((h) => [h.buildingId, h]));
  const pointHexMap = new Map(mapHexes.map((h) => [`${h.q},${h.r}`, h]));

  const contractBuildinds = buildings.filter((b) => b.contracts !== undefined);
  for (const building of contractBuildinds) {
    const startingHex = buildingHexMap.get(building.id);
    if (!startingHex) continue;
    for (const contract of building.contracts!) {
      const endHex = buildingHexMap.get(contract.buildingId);
      if (!endHex) continue;

      const path = startDijkstrasAlgo({ startingHex, endHex, mapHexes, roads });
      if (!path) continue;
      const hexIds: number[] = [];
      for (const point of path) {
        const hex = pointHexMap.get(`${point.q},${point.r}`);
        if (!hex) continue;
        hexIds.push(hex.id);
      }

      const length = hexIds.length - 1;

      if (length < contract.hexIds.length - 1) {
        contract.hexIds = hexIds;
      }
    }
  }
}
