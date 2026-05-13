import {
  baseGoldRate,
  baseTrainingProgress,
  baseWheatRate,
  baseWoodRate,
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
} from "@repo/shared/data/buildings.js";
import { estimateConsumption } from "@repo/shared/helpers/contracts.js";
import { BASE_HEX_POPULATION, Hex, RESOURCES } from "@repo/shared/data/hex_map.js";
import { Nation } from "@repo/shared/data/nations.js";
import { findBuildingNameByCategory } from "@repo/shared/helpers/buildings.js";
import { roundToNearestDecimal } from "../lib/helpers.js";
import { GameCtx } from "../trpc/index.js";
import { calculatePopulationChange } from "./map.js";

export function buildingOutput(gameCtx: GameCtx) {
  const { buildings } = gameCtx;
  // sort buildings into different groups
  const civilian = buildings.filter((b) => b.category === "CIVILIAN");
  const farms = buildings.filter((b) => b.category === "FARM");
  const barracks = buildings.filter((b) => b.category === "BARRACK");
  const woodcamps = buildings.filter((b) => b.category === "WOODCAMP");
  const watchtowers = buildings.filter((b) => b.category === "WATCHTOWER");

  // calculate output for every building (farms and)
  for (const civ of civilian) {
    calculateCivilian(civ, gameCtx);
  }
  for (const farm of farms) {
    calculateFarm(farm, gameCtx);
  }
  for (const barrack of barracks) {
    calculateBarracks(barrack, gameCtx);
  }
  for (const woodcamp of woodcamps) {
    calculateWoodcamp(woodcamp, gameCtx);
  }
  for (const tower of watchtowers) {
    calculateWatchtower(tower, gameCtx);
  }
}

function calculateFarm(building: Building, gameCtx: GameCtx) {
  const { mapHexes } = gameCtx;

  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, 1); // 1 means 100% consumption (since farm does not consume anything)

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

function calculateCivilian(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings, nations } = gameCtx;

  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);

  // now calculate gold output
  const nation = nations.find((n) => n.id === hex.owner);
  if (!nation) return;

  const gold = Math.round(hex.population * baseGoldRate * avgConsumption);
  nation.gold += gold;
}

function calculateBarracks(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings, nations } = gameCtx;

  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);
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
  const idxsToDelete: number[] = [];
  if (training && training.length > 0) {
    for (const [i, army] of training.entries()) {
      if (trainingCap >= maxTraining) continue;

      const amountTrained = Math.min(army.amount, maxTraining - trainingCap);
      const progress = Math.round(baseTrainingProgress * amountTrained * avgConsumption);

      army.progress += progress;
      trainingCap += amountTrained;

      // if progress is full, deploy army
      if (army.progress >= army.amount) {
        const ownerArmyInHex = hex.army.find((a) => a.nationId === army.nationId);
        if (!ownerArmyInHex) {
          hex.army.push({ amount: army.amount, nationId: army.nationId });
        } else {
          ownerArmyInHex.amount += army.amount;
        }

        // add index to delete after loop
        idxsToDelete.push(i);
      }
    }

    // delete armies that finished training and deployed
    building.trainingTroops = training.filter((_, i) => !idxsToDelete.includes(i));
  }
}

function calculateWoodcamp(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings } = gameCtx;

  // apply resource consumption
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);

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

function calculateWatchtower(building: Building, gameCtx: GameCtx) {
  const { mapHexes, buildings } = gameCtx;

  // apply resource consumption
  const consumptionMod = calculateConsumption({ building, gameCtx });

  // ex: wheatRatio: 0.5, woodRatio: 1 -> avgConsumption = 0.75
  const avgConsumption = calculateAverageConsumption(consumptionMod); // avg consumption of all resources

  // find hex of this building and calculate population change
  const hex = mapHexes.find((h) => h.buildingId === building.id);
  if (!hex || !hex.population) return;

  calculatePopulationChange(hex, gameCtx, avgConsumption);
}

// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
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
  gameCtx,
}: {
  building: Building;
  gameCtx: GameCtx;
}) {
  const { mapHexes } = gameCtx;

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
    console.log(`consumed this turn by ${building.category}`, consumed);
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
    const resourceNum = Object.values(consumptionMod).length;
    avgConsumption += resourceNum > 0 ? ratio / resourceNum : 0;
  }

  return avgConsumption;
}

export function cancelBuilding(ctx: GameCtx, hexIds: number[], nation: Nation) {
  const hexIdMap = new Map(ctx.mapHexes.filter((h) => h.build_queue).map((h) => [h.id, h]));

  for (const id of hexIds) {
    const hex = hexIdMap.get(id);
    if (!hex || !hex.build_queue) continue;
    if (hex.owner !== nation.id) continue;

    // cancel building
    hex.build_queue = null;
  }
}

// delete buildings by their id
export function deleteBuilding(ctx: GameCtx, deleteIds: string[], nation: Nation) {
  const buildingHexMap = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );
  const buildingIdMap = new Map(ctx.buildings.map((b) => [b.id, b]));

  for (const id of deleteIds) {
    const building = buildingIdMap.get(id);
    const hex = buildingHexMap.get(id);
    if (!building || !hex) continue;
    if (hex.owner !== nation.id) continue;

    // delete building
    const idx = ctx.buildings.indexOf(building);
    if (idx !== -1) {
      ctx.buildings.splice(idx, 1);
      hex.buildingId = null;
      hex.population = BASE_HEX_POPULATION;
    }
  }
}
