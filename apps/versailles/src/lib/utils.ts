import { Contract } from "@/app/game/page";
import { Building, BUILDINGS, findBuildingNameByCategory, Hex, RESOURCES } from "@repo/shared";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useGameStore } from "./gameStore";
import { useIntentStore } from "./intentStore";

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

export function getFirstFreeResource({
  startBuilding,
  endBuilding,
  contracts,
}: {
  startBuilding: Building;
  endBuilding: Building;
  contracts: Contract[];
}) {
  const startName = findBuildingNameByCategory({
    buildingCategory: startBuilding.category,
    level: startBuilding.level,
  });
  if (!startName) return;

  const takenResources = new Set<RESOURCES>(
    contracts
      .filter((c) => c.startBuildingId === startBuilding.id && c.endBuildingId === endBuilding.id)
      .map((c) => c.resource)
  );

  // get first available
  const producing = BUILDINGS[startName].producing;
  if (!producing) return;
  const availableResource = producing.find((r) => !takenResources.has(r));
  if (!availableResource) return;
  return availableResource;
}

export function getMergedContracts(buildingId: string) {
  const serverContracts =
    useGameStore.getState().buildings.find((b) => b.id === buildingId)?.contracts ?? [];

  const clientContracts = useIntentStore
    .getState()
    .contracts.filter((c) => c.startBuildingId === buildingId);

  const mappedServerContracts: Contract[] = serverContracts.map((c) => ({
    id: c.id,
    hexIds: c.hexIds,
    startBuildingId: buildingId, // start building - passed from props
    endBuildingId: c.buildingId, // end building - get from contract
    amount: c.amount,
    autoAdjust: c.autoAdjust,
    resource: c.resource,
    progress: c.progress,
  }));

  console.log("mappedServerContracts", mappedServerContracts);

  return [...mappedServerContracts, ...clientContracts];
}
