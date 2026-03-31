import {
  baseGoldRate,
  baseTrainingProgress,
  baseWheatRate,
  baseWoodRate,
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  estimateConsumption,
  findBuildingNameByCategory,
  getBuilding,
  Hex,
  Nation,
  RESOURCES,
} from "@repo/shared";
import { calculatePopulationChange, getHexById } from "./map.js";
import { roundToNearestDecimal } from "../lib/helpers.js";

{
  /*export function calculateSupply(buildings: Building[], mapHexes: Hex[]) {
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
} */
}

export function buildingOutput(buildings: Building[], mapHexes: Hex[], nations: Nation[]) {
  // sort buildings into different groups
  const civilian = buildings.filter((b) => b.category === "CIVILIAN");
  const farms = buildings.filter((b) => b.category === "FARM");
  const barracks = buildings.filter((b) => b.category === "BARRACK");
  const lumber_sets = buildings.filter((b) => b.category === "LUMBERJACK_SETTLEMENT");
  const watchtowers = buildings.filter((b) => b.category === "WATCHTOWER");

  // calculate output for every building (farms and)
  for (const civ of civilian) {
    calculateCivilian(civ, mapHexes, buildings, nations);
  }
  for (const farm of farms) {
    calculateFarm(farm, mapHexes, buildings);
  }
  for (const barrack of barracks) {
    calculateBarracks(barrack, mapHexes, buildings, nations);
  }
  for (const lumber_set of lumber_sets) {
    calculateLumberjack(lumber_set, mapHexes, buildings);
  }
  for (const tower of watchtowers) {
    calculateWatchtower(tower, mapHexes, buildings);
  }
}

function calculateFarm(building: Building, mapHexes: Hex[], buildings: Building[]) {
  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, buildings, 1);

  // now calculate wheat output
  const max = BUILDINGS[name].storageCap["wheat"] ?? 0;
  const wheatOutput = Math.round(hex.population * baseWheatRate);
  if (building.storage) {
    const wheatStorage = building.storage.find((s) => s.type === "wheat");
    if (!wheatStorage) return;
    const newAmount = Math.min(wheatStorage.amount + wheatOutput, max);
    wheatStorage.amount = newAmount;
  }
}

function calculateCivilian(
  building: Building,
  mapHexes: Hex[],
  buildings: Building[],
  nations: Nation[]
) {
  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, mapHexes });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, buildings, avgConsumption);

  // now calculate gold output
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  const gold = Math.round(hex.population * baseGoldRate * avgConsumption);
  nation.gold += gold;
}

function calculateBarracks(
  building: Building,
  mapHexes: Hex[],
  buildings: Building[],
  nations: Nation[]
) {
  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, mapHexes });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, buildings, avgConsumption);
  // don't forget to re-calculate population change in hex after finding amount of trained army this turn
  // or when deploying army

  // add progress to existing troops in training
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  // filter out any training army that does not belong to owner of hex
  const filtered = building.trainingTroops?.filter((t) => t.nationId === hex.owner);
  building.trainingTroops = filtered;

  const training = building.trainingTroops;
  const maxTraining = BUILDINGS[name].maxTraining ?? 0;
  let trainingCap = 0; // add progress to every training contract until reached cap
  if (training && training.length > 0) {
    for (const army of training) {
      if (trainingCap >= maxTraining) continue;

      const amountTrained = Math.min(army.amount, maxTraining - trainingCap);
      const progress = Math.round(baseTrainingProgress * amountTrained * avgConsumption);

      army.progress += progress;
      trainingCap += amountTrained;

      // if progress is full, deploy army
      if (army.progress > army.amount) {
        const ownerArmyInHex = hex.army.find((a) => a.nationId === army.nationId);
        if (!ownerArmyInHex) {
          hex.army.push({ amount: army.amount, nationId: army.nationId });
        } else {
          ownerArmyInHex.amount += army.amount;
        }

        // recalculate population
        hex.population -= army.amount;
      }
    }
  }
}

function calculateLumberjack(building: Building, mapHexes: Hex[], buildings: Building[]) {
  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, mapHexes });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, buildings, avgConsumption);

  // now calculate wood output
  const max = BUILDINGS[name].storageCap["wood"] ?? 0;
  const woodOutput = Math.round(hex.population * baseWoodRate * avgConsumption);
  if (building.storage) {
    const woodStorage = building.storage.find((s) => s.type === "wood");
    if (!woodStorage) return;
    const newAmount = Math.min(woodStorage.amount + woodOutput, max);
    woodStorage.amount = newAmount;
  }
}

function calculateWatchtower(building: Building, mapHexes: Hex[], buildings: Building[]) {
  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, mapHexes });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, buildings, avgConsumption);
}

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
  // add storage if new resources have been added
  const storage = [];

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level + 1,
  });
  for (const type of Object.keys(BUILDINGS[name].storageCap)) {
    storage.push({ type: type as RESOURCES, amount: 0 });
  }

  building.storage = storage;
  building.level += byLevels ?? 1;
}

export function calculateConsumption({
  building,
  mapHexes,
}: {
  building: Building;
  mapHexes: Hex[];
}) {
  // this function calculates and applies consumption, returning the consumed ratio
  // later we use that ratio to multiply our output.

  const storage = building.storage;

  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });

  const consuming = Object.keys(BUILDINGS[name].consumptionMod);
  const estConsumption = estimateConsumption({ building, mapHexes });
  if (!estConsumption || !name || !storage) {
    return {};
  }

  let estConsumptionRatio = new Map<string, number>();
  for (const resource of consuming) {
    const currStoredResource = storage.find((s) => s.type === resource);
    if (!currStoredResource) continue;
    // don't add a resource if it can't be stored and doesn't have a maximum cap
    const storageCap = BUILDINGS[name].storageCap[resource as RESOURCES];
    if (!storageCap || storageCap === 0) continue;

    // consume resource
    const left = Math.round(Math.max(currStoredResource.amount - estConsumption[resource], 0));
    const consumed = Math.max(currStoredResource.amount - left, 0); // just in case
    currStoredResource.amount = left;

    const need = estConsumption[resource] ?? 0;

    const ratio = need > 0 ? consumed / need : 1; // если не нужно — считаем, что всё ок
    estConsumptionRatio.set(
      resource,
      roundToNearestDecimal(ratio, 100) // to hundredth
    );
  }

  return Object.fromEntries(estConsumptionRatio);
}

function calculateAverageConsumption(consumptionMod: Record<string, number>) {
  let avgConsumption = 0; // median consumption of all resources
  for (const ratio of Object.values(consumptionMod)) {
    const resourceNum = consumptionMod.length;
    avgConsumption += resourceNum > 0 ? ratio / consumptionMod.length : 0;
  }

  return avgConsumption;
}
