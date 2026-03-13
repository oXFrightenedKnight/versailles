import {
  AVAILABLE_TILES,
  BUILD_TIME,
  BUILDINGS,
  BuildingType,
  Hex,
  Nation,
  NATION_NAMES,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { getHexById, randomNationColor } from "./map.js";

export type newBuildings = {
  hexId: number;
  building: BuildingType;
}[];

export function generateNations() {
  // choose nations and assign available spaces
  let availableTiles = [...AVAILABLE_TILES];
  let availableNations = Object.values(NATION_NAMES);
  const nations: Nation[] = [];

  for (let i = 0; i < 6; i++) {
    const randomIdx = Math.floor(1 + Math.random() * availableNations.length) - 1;
    const randomTileIdx = Math.floor(1 + Math.random() * availableTiles.length) - 1;
    const agression = Math.random();
    const expansionBias = Math.random();

    const nationIdx = availableNations[randomIdx];
    availableNations.splice(randomIdx, 1);
    const tileIdx = availableTiles[randomTileIdx];
    availableTiles.splice(randomTileIdx, 1);
    nations.push({
      id: nationIdx,
      capitalTileIdx: tileIdx,
      color: randomNationColor(),
      aggression: agression,
      expansionBias: expansionBias,
      isPlayer: false,
      atWar: [],
    });
  }

  // assign player to one of the nations (for now)
  const randomPlayer = Math.floor(1 + Math.random() * nations.length) - 1;
  nations[randomPlayer].isPlayer = true;

  // every country starts with a village (capital)
  for (const nation of nations) {
    if (AVAILABLE_TILES.includes(nation.capitalTileIdx)) {
      const tile = getHexById(nation.capitalTileIdx);
      if (tile) {
        tile.owner = nation.id;
        tile.building = { type: "village" };
        const randomPopulation = 750 + Math.floor(1 + Math.random() * 200);
        tile.population = randomPopulation;
        tile.army.push({ amount: 100, nationId: nation.id });
      } else continue;
    }
  }

  return nations;
}

// put new buildings in queue and give progress to older ones
export function buildNationBuildings({
  nation,
  mapHexes,
  newBuildings,
}: {
  nation: Nation;
  mapHexes: Hex[];
  newBuildings: newBuildings;
}) {
  const arr = newBuildings.map((obj) => obj.hexId);
  if (arr.length !== new Set(arr).size)
    throw new Error("Duplicate hex ids in buildings are not allowed!");
  const ownerTiles = mapHexes.filter((hex) => hex.owner === nation.id);
  const buildHexes = mapHexes.filter((hex) => arr.includes(hex.id)); // hexes that we will be queueing build on

  // make building map so that we don't have to O(n^2)
  const buildingMap = new Map(newBuildings.map((obj) => [obj.hexId, obj.building]));

  for (const hex of buildHexes) {
    if (hex.owner !== nation.id || hex.build_queue || !hex.owner) continue;

    const building = buildingMap.get(hex.id); // find building type

    if (!building || building === "nomadic_camp") continue;

    // check if buildings match category and queued building is one level higher
    if (
      hex.building &&
      hex.building.type !== "nomadic_camp" &&
      (BUILDINGS[building].category !== BUILDINGS[hex.building.type].category ||
        BUILDINGS[building].level !== BUILDINGS[hex.building.type].level + 1)
    )
      continue;

    hex.build_queue = { building: building, progress: 0, owner: hex.owner }; // queue building
  }

  // give progress to all buildings in queue OF THAT NATION ONLY
  for (const hex of ownerTiles) {
    if (!hex.build_queue) continue;

    hex.build_queue.progress++;

    if (hex.build_queue.progress >= BUILD_TIME[hex.build_queue.building]) {
      hex.building = { type: hex.build_queue.building };
      hex.build_queue = null;
    }
  }
  return mapHexes;
}

export function getNationById(nationId: string) {
  const nations = memoryStore.maps.get("nations") as Nation[];
  if (!nations) return null;

  const nation = nations.find((n) => n.id === nationId);
  if (nation) return nation;
  return null;
}

// next work on army
