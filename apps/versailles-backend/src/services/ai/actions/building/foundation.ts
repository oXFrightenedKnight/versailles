import { getBuildingsByIdMap } from "#services/buildings/queries.js";
import { getNationHexes } from "#services/genNations.js";
import { GameCtx } from "#trpc/index.js";
import { OpeningTarget } from "./types";

// returns an array of hexes that are the closest to fulfilling the current foundation target
export function selectClosestOpeningHexes(ctx: GameCtx, target: OpeningTarget, nationId: string) {
  let currHighestLvl = 0;
  let closestHexes = new Set<number>();

  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);

  const nationHexes = getNationHexes(ctx.mapHexes, nationId);

  for (const hex of nationHexes) {
    const building = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;

    if (building && building.category !== target.category) continue;

    const buildingLevel = building ? building.level : 0;

    // skip buildings that already meet the target level
    if (buildingLevel >= target.level) continue;

    if (buildingLevel < currHighestLvl) {
      continue;
    } else if (buildingLevel === currHighestLvl) {
      closestHexes.add(hex.id);
    } else if (buildingLevel > currHighestLvl) {
      // update current highest level
      currHighestLvl = buildingLevel;

      // update hex set
      closestHexes = new Set<number>([hex.id]);
    }
  }

  return closestHexes;
}
