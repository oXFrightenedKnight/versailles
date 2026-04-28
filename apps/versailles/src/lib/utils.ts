import { ArmyTraining, Contract, newBuilding } from "./types/game";
import {
  Building,
  BUILDINGS,
  findBuildingNameByCategory,
  getBuilding,
  Hex,
  Nation,
  RESOURCES,
  SupplyContract,
} from "@repo/shared";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MergedContractChanges, ServerContractUpdate } from "./intentStore";
import { MergedContract } from "./types/game";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLastElement(array: unknown[], element: unknown) {
  // Find the index of the element
  const index = array.indexOf(element);

  // Return true if the index is the last index in the array
  return index !== -1 && index === array.length - 1;
}

export function getHexById(id: number, mapHexes: Hex[]) {
  // switch to db request later

  for (const hex of mapHexes) {
    if (hex.id === id) {
      return hex as Hex;
    }
  }
  return null;
}

export function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

export function randomNumber(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function resolveValue<T>(value: T | ((prev: T) => T), prev: T): T {
  if (typeof value === "function") {
    return (value as (prev: T) => T)(prev); // tell ts that value is for sure a
    // function and call it along with passing prev (old data)
  }
  return value;
}

export function calculateOptimisticManpower(
  armyTraining: ArmyTraining[],
  playerNation: Nation | null
) {
  let totalArmy = 0;
  for (const army of armyTraining) {
    totalArmy += army.amount;
  }

  return playerNation?.manpower ? playerNation.manpower - totalArmy : 0;
}

export function calculateOptimisticGold(
  mapHexes: Hex[],
  buildBuildings: newBuilding[],
  buildings: Building[],
  playerNation: Nation | null
) {
  let totalCost = 0;
  for (const building of buildBuildings) {
    const hex = mapHexes?.find((h) => h.id === building.hexId);
    if (!hex) continue;
    const existingLevel = hex.buildingId
      ? (getBuilding({ buildings, id: hex.buildingId })?.level ?? 0)
      : 0;
    const totalLevel = existingLevel + building.levelsToUpgrade;
    const name = findBuildingNameByCategory({
      buildingCategory: building.buildingType,
      level: totalLevel,
    });
    const cost = BUILDINGS[name].buildCost;
    totalCost += cost;
  }
  return playerNation?.gold ? playerNation.gold - totalCost : 0;
}
