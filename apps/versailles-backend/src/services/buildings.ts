import {
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  findBuildingNameByCategory,
  getBuilding,
  Hex,
  RESOURCES,
} from "@repo/shared";
import { getHexById } from "./map.js";

export function calculateSupply(buildings: Building[], mapHexes: Hex[]) {
  // find all buildings that have some sort of contract
  const deliveryBuildings = buildings.filter((b) => b.contracts && b.contracts.length > 0);
  // calculate contract progress for every contract of every building
  for (const building of deliveryBuildings) {
    for (const contract of building.contracts!) {
      const total = contract.hexIds.length;
      const increase = 1 / total;
      contract.progress += increase;

      if (contract.progress === 1) {
        const building = getBuilding({ buildings, id: contract.buildingId });
        if (!building) continue;
        const name = findBuildingNameByCategory({
          buildingCategory: building.category,
          level: building.level,
        });
        if (!name) continue;

        // check if building has enough space to store
        const resourceStorage = building.storage?.find((s) => s.type === contract.resource);
        const maxStorage =
          Object.entries(BUILDINGS[name].storageCap).find(
            ([type, amount]) => type === contract.resource
          )?.[1] ?? 0;
        if (!resourceStorage) continue;
        if (resourceStorage.amount + contract.amount > maxStorage) continue;
        resourceStorage.amount += contract.amount;
        contract.progress = 0;
      }
    }
  }
}

export function buildingOutput(buildings: Building[]) {
  // sort buildings into different groups
  const civilian = buildings.filter((b) => b.category === "CIVILIAN");
  const farms = buildings.filter((b) => b.category === "FARM");
  const barracks = buildings.filter((b) => b.category === "BARRACK");
  const lumber_sets = buildings.filter((b) => b.category === "LUMBERJACK_SETTLEMENT");
  const watchtowers = buildings.filter((b) => b.category === "WATCHTOWER");

  // calculate output for every building (farms and)
  for (const civ of civilian) {
    calculateCivilian(civ);
  }
}

function calculateFarm() {}

function calculateCivilian(building: Building) {}

function calculateBarracks() {}

export function BuildBuilding({
  buildings,
  hex,
  category,
  level,
}: {
  buildings: Building[];
  hex: Hex;
  category: BUILDINGS_CATEGORY;
  level?: number;
}) {
  const storage = [];
  const building = findBuildingNameByCategory({
    buildingCategory: category, // hex.build_queue.category
    level: level ?? 1,
  });

  // add dynamic storage
  for (const type of Object.keys(BUILDINGS[building].storageCap)) {
    storage.push({ type: type as RESOURCES, amount: 0 });
  }

  const id = crypto.randomUUID();
  hex.buildingId = id;

  buildings.push({
    id,
    category: category,
    level: level ?? 1,
    storage: storage,
  });
}

export function UpgradeBuilding({ building, byLevels }: { building: Building; byLevels?: number }) {
  building.level += byLevels ?? 1;
}
