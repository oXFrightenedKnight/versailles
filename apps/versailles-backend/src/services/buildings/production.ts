import { GameCtx } from "#trpc/index.js";
import { Building, PRODUCIBLE_RESOURCE } from "@repo/shared";
import { calculateFarm } from "./categories/farm";
import { calculateWoodcamp } from "./categories/woodcamp";
import { calculateCivilian } from "./categories/civilian";
import { calculateBarracks } from "./categories/barrack";
import { calculateWatchtower } from "./categories/watchtower";

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
