import {
  Biome,
  BIOME_GROWTH,
  BIOME_MOD,
  BIOMES,
  Building,
  BUILDINGS,
  CreatedHexes,
  findBuildingNameByCategory,
  findNeighbors,
  getBuilding,
  Hex,
  HEX_DIRECTIONS,
  WOOD_MOD,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { BuildBuilding } from "./buildings.js";
import { GameCtx } from "../trpc/index.js";

// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
// generates the mathematical map & coordinates
export function generateHexMap(radius: number, buildings: Building[]) {
  const hexes: Hex[] = [];
  let id = 0;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;

      if (Math.abs(s) <= radius) {
        hexes.push({
          id: id++,
          q,
          r,
          biome: null,
          population: null,
          buildingId: null,
          owner: null,
          build_queue: null,
          army: [],
          wood: 0,
        });
      }
    }
  }

  // Assign Biomes
  const availableHexes = [...hexes]; // objects in avalableHexes only refer to actual
  // hexes rather than making a new copy.
  const addedHexes: CreatedHexes = {
    desert: 0,
    mountains: 0,
    plains: 0,
    forest: 0,
  };
  for (const biome of BIOMES) {
    while (Math.random() < 1 / (1 + addedHexes[biome])) {
      const randomIndex = Math.floor(Math.random() * availableHexes.length);
      const hex = availableHexes.splice(randomIndex, 1)[0];
      hex.biome = biome;
      addedHexes[biome] += 1;
    }
  }

  // wave 2: generate natural structure for most tiles
  const queue = hexes.filter((h) => h.biome !== null);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = findNeighbors(current, hexes);
    for (const n of neighbors) {
      if (n.biome !== null) continue;
      if (Math.random() < 0.6 * BIOME_MOD[current.biome!]) {
        n.biome = current.biome;
        queue.push(n);
      }
    }
  }

  // wave 3: final assign for those that were left out
  for (const hex of hexes) {
    if (hex.biome !== null) continue;

    const neighbors = findNeighbors(hex, hexes).filter((n) => n.biome !== null);

    if (neighbors.length === 0) {
      hex.biome = "plains";
      continue;
    }

    // count how many biomes are around this tile
    const counts: Record<Biome, number> = {
      desert: 0,
      plains: 0,
      forest: 0,
      mountains: 0,
    };

    for (const n of neighbors) {
      if (!n.biome) continue;
      counts[n.biome] += 1;
    }

    // превращаем в "мешок шансов"
    const pool: Biome[] = [];

    for (const biome in counts) {
      for (let i = 0; i < counts[biome as Biome]; i++) {
        pool.push(biome as Biome);
      }
    }

    // guaranteed chosen
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    hex.biome = chosen;
  }

  // assign nomadic camps to random tiles
  const randomHexes = randomLengthArray(
    hexes.filter((hex) => !hex.buildingId),
    10,
    25
  ); // get from 10 to 25 random hexes

  for (const hex of randomHexes) {
    BuildBuilding({ category: "CIVILIAN", buildings, hex });
  }

  // assign starting population & urban
  for (const hex of hexes) {
    let randomPopulation = 0;
    if (hex.buildingId) {
      if (hex.biome === "plains") {
        randomPopulation = 150 + Math.floor(1 + Math.random() * 300);
      } else if (hex.biome === "forest") {
        randomPopulation = 75 + Math.floor(1 + Math.random() * 225);
      } else if (hex.biome === "desert") {
        randomPopulation = 35 + Math.floor(1 + Math.random() * 100);
      } else if (hex.biome === "mountains") {
        randomPopulation = 0 + Math.floor(1 + Math.random() * 50);
      }
    } else {
      randomPopulation = 0 + Math.floor(1 + Math.random() * 10);
    }

    hex.population = randomPopulation;
  }

  // assign wood
  for (const hex of hexes) {
    let randomWood = Math.floor(Math.random() * 50 * WOOD_MOD[hex.biome ?? "plains"]);
    hex.wood = randomWood;
  }
  return hexes;
}

export function randomNationColor(): string {
  const hue = Math.floor(Math.random() * 360); // оттенок
  const saturation = 40 + Math.random() * 30; // 40–70%
  const lightness = 35 + Math.random() * 20; // 35–55%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// ONLY WORKS WHEN THE MAP HAS BEEN GENERATED
export function getHexById(id: number) {
  // switch to db request later
  const hexes = memoryStore.maps.get("mapHexes");

  for (const hex of hexes) {
    if (hex.id === id) {
      return hex as Hex;
    }
  }
  return null;
}

export function calculatePopulationChange(hex: Hex, gameCtx: GameCtx, consumeMod: number) {
  const { buildings } = gameCtx;

  if (!hex.owner || !hex.buildingId) return;
  const building = getBuilding({ buildings, id: hex.buildingId });
  if (!building) return;
  const buildingName = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  const cap =
    BUILDINGS[buildingName || "nomadic_camp"].popCap * BIOME_GROWTH[hex.biome || "plains"];
  const rate = 0.15 * BIOME_GROWTH[hex.biome || "plains"];

  let currPopulation = hex.population || 0;

  const baseGrowth = (cap - currPopulation) * rate;
  let tailGrowth = 0;
  let minimalGrowth = 0;
  if (currPopulation > cap) {
    const excess = currPopulation - cap;
    tailGrowth = cap * 0.0025 * Math.exp(-excess / 1000);
  } else {
    const left = cap - currPopulation;
    minimalGrowth = cap * 0.0025 * Math.exp(-left / 1000);
  }

  const growth = Math.max(minimalGrowth, baseGrowth) + Math.max(0, tailGrowth);

  currPopulation += growth * consumeMod;
  hex.population = Math.round(currPopulation);
}

function randomLengthArray(array: Hex[], min: number, max: number) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min; // random number from min to max
  const arr = [...array].sort(() => Math.random() - 0.5);

  return arr.slice(0, count);
}
