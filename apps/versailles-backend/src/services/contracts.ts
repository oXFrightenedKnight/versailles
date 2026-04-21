import {
  Building,
  BUILDINGS,
  calculateExportAmount,
  findBuildingNameByCategory,
  getBuilding,
  getHexByAxial,
  Hex,
  resources,
  RESOURCES,
  Road,
  startDijkstrasAlgo,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";

export function createContracts({
  contracts,
  gameCtx,
}: {
  contracts: {
    startBuildingId: string;
    endBuildingId: string;
    amount: number;
    resource: RESOURCES;
    autoAdjust: boolean;
  }[];
  gameCtx: GameCtx;
}) {
  const { mapHexes, buildings, roads } = gameCtx;

  // check whether starting building is allowed to have contracts
  for (const contract of contracts) {
    const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
    const startingHex = mapHexes.find((h) => h.buildingId === contract.startBuildingId);
    const endHex = mapHexes.find((h) => h.buildingId === contract.endBuildingId);
    const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });
    if (!startBuilding || !endHex?.buildingId || !startingHex || !endHex || !endBuilding) continue;

    // -- VALIDATION --
    // check if building produces anything to export
    const startName = findBuildingNameByCategory({
      buildingCategory: startBuilding?.category,
      level: startBuilding.level,
    });
    if (!startName) continue;
    if (!BUILDINGS[startName].producing || BUILDINGS[startName].producing.length === 0) continue;

    // check if destination is allowed to store that resource
    const endName = findBuildingNameByCategory({
      buildingCategory: endBuilding.category,
      level: endBuilding.level,
    });
    if (!endName) continue;

    const canStore = BUILDINGS[endName].storageCap?.[contract.resource];

    if (!canStore || canStore <= 0) continue;

    // check if these two buildings already have a contract with the same resource
    const buildingContracts = startBuilding.contracts ?? [];

    const sameContract = buildingContracts.find(
      (c) => c.buildingId === endBuilding.id && c.resource === contract.resource
    );
    if (sameContract) continue;

    // --- CREATE ---
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

    if (!resources.includes(contract.resource)) continue;

    startBuilding.contracts = [
      ...prevContracts,
      {
        id: crypto.randomUUID(),
        hexIds,
        buildingId: endHex.buildingId,
        amount: contract.amount,
        resource: contract.resource,
        progress: 0,
        autoAdjust: contract.autoAdjust,
      },
    ];
  }
}
export function executeContracts({ buildings }: GameCtx) {
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

        const destName = findBuildingNameByCategory({
          buildingCategory: endBuilding.category,
          level: endBuilding.level,
        });
        if (!destName) continue;

        const amount = Math.min(startResourceStore.amount, contract.amount);
        const endResourceMax = BUILDINGS[destName].storageCap[contract.resource] ?? 0;

        // amount of resource that will be actually sent
        const outForDelivery = Math.min(amount, endResourceMax - endResourceStore.amount);

        console.log("currently stored:", startResourceStore.amount);
        startResourceStore.amount -= outForDelivery;
        endResourceStore.amount += outForDelivery;

        console.log("amount sent", amount);

        contract.progress = 0;
      }
    }
  }
}

export function recalculateContractsPaths({ buildings, roads, mapHexes }: GameCtx) {
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

export function recalculateContractsAmounts({ buildings, mapHexes }: GameCtx) {
  const buildingHexMap = new Map(mapHexes.map((h) => [h.buildingId, h]));

  const contractBuildinds = buildings.filter((b) => b.contracts !== undefined);
  for (const building of contractBuildinds) {
    const startingHex = buildingHexMap.get(building.id);
    if (!startingHex) continue;
    for (const contract of building.contracts!) {
      if (!contract.autoAdjust) continue; // only recalculate with auto-adjust
      const endHex = buildingHexMap.get(contract.buildingId);
      const endBuilding = getBuilding({ buildings, id: contract.buildingId });
      if (!endHex || !endBuilding) continue;

      const amount = calculateExportAmount({
        startBuilding: building,
        endBuilding,
        length: contract.hexIds.length - 1,
        resource: contract.resource,
        mapHexes,
        buildings,
      });

      if (!amount) continue;

      console.log(`amount for ${endHex}:`, amount);
      contract.amount = amount;
    }
  }
}
