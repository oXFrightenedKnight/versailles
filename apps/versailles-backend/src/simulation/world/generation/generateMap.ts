// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX

import { GameCtx } from "#trpc";
import { Hex, Biome, Nation } from "@repo/shared";
import {
  MAP_RADIUS,
  CreatedHexes,
  BIOMES,
  findNeighbors,
  BIOME_MOD,
  WOOD_MOD,
} from "@repo/shared/map";
import { NATION_COLORS, FALLBACK_COLOR } from "@repo/shared/nations";
import { BuildBuilding } from "../../buildings/construction";

// generates the mathematical map & coordinates
export function generateHexMap(ctx: GameCtx) {
  const radius = MAP_RADIUS;
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
    BuildBuilding({ category: "CIVILIAN", ctx, hexId: hex.id });
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
  ctx.mapHexes = hexes;
}

export function randomNationColor(nations: Nation[]): string {
  const takenColors = nations.map((n) => n.color);

  const availableColors = NATION_COLORS.filter((c) => !takenColors.includes(c));

  const idx = Math.floor(Math.random() * availableColors.length);

  const color = availableColors[idx] ?? FALLBACK_COLOR;
  return color;
}

function randomLengthArray(array: Hex[], min: number, max: number) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min; // random number from min to max
  const arr = [...array].sort(() => Math.random() - 0.5);

  return arr.slice(0, count);
}
