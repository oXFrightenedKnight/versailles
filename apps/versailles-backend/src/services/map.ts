import {
  axialToCube,
  Biome,
  BIOME_GROWTH,
  BIOME_MOD,
  BIOMES,
  Building,
  BUILDINGS,
  CreatedHexes,
  cubeDistance,
  findBuildingNameByCategory,
  findNeighbors,
  getBuilding,
  Hex,
  HEX_DIRECTIONS,
  MAP_RADIUS,
  Nation,
  WOOD_MOD,
} from "@repo/shared";
import { memoryStore } from "../server/memoryStore.js";
import { GameCtx } from "../trpc/index.js";
import { BuildBuilding } from "./buildings.js";
import { getBuildingsByIdMap } from "./ai/decision/helpers.js";

// DO NOT CHANGE THIS FUNCTION TO ACCEPT GAMECTX
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

export function randomNationColor(): string {
  const hue = Math.floor(Math.random() * 360); // оттенок
  const saturation = 40 + Math.random() * 30; // 40–70%
  const lightness = 35 + Math.random() * 20; // 35–55%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// ONLY WORKS WHEN THE MAP HAS BEEN GENERATED
export function getHexById(id: number, ctx: GameCtx) {
  for (const hex of ctx.mapHexes) {
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

// returns enemy hexes that border with nation
export function getBorderHexes(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => nationId === n.id);
  if (!nation) return null;

  const hexAxialMap = new Map(ctx.mapHexes.map((h) => [`${h.q},${h.r}`, h]));
  const hexIdMap = new Map(ctx.mapHexes.map((h) => [h.id, h]));

  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const neighborHexIds = new Set<number>();

  for (const hex of nationHexes) {
    for (const dir of HEX_DIRECTIONS) {
      const q = hex.q + dir.dq;
      const r = hex.r + dir.dr;

      const neighborHex = hexAxialMap.get(`${q},${r}`);
      if (!neighborHex) continue;
      if (neighborHex.owner === nation.id) continue;

      neighborHexIds.add(neighborHex.id);
    }
  }
  return [...neighborHexIds].flatMap((id) => hexIdMap.get(id) ?? []);
}

// returns hexes of nation that border with other nation
export function getNationBorderHexes(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => nationId === n.id);
  if (!nation) return [];

  const hexAxialMap = new Map(ctx.mapHexes.map((h) => [`${h.q},${h.r}`, h]));

  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  // <hexId, who owns bordering hex>
  const nationBorderHexIds = new Map<number, (string | null)[]>();

  for (const hex of nationHexes) {
    for (const dir of HEX_DIRECTIONS) {
      const q = hex.q + dir.dq;
      const r = hex.r + dir.dr;

      const neighborHex = hexAxialMap.get(`${q},${r}`);
      if (!neighborHex) continue;
      if (neighborHex.owner === nation.id) continue;

      const prevSet = nationBorderHexIds.get(hex.id) ?? [];
      nationBorderHexIds.set(hex.id, [...prevSet, neighborHex.owner]);
    }
  }
  return [...nationBorderHexIds].flatMap(([id, ownerArray]) => ({
    hexId: id,
    neighborIds: ownerArray,
  }));
}

export function getNationArmyFromHex(hex: Hex, nationId: string) {
  return hex.army.find((obj) => obj.nationId === nationId)?.amount ?? 0;
}

export function getHexAxialMap({ mapHexes }: { mapHexes: Hex[] }) {
  return new Map(mapHexes.map((h) => [`${h.q},${h.r}`, h]));
}
export function getHexIdMap(ctx: GameCtx) {
  return new Map(ctx.mapHexes.map((h) => [h.id, h]));
}

// returns hexIds in which nation army is allowed to walk into
export function getAllowedArmyWalk(ctx: GameCtx, nation: Nation) {
  const hexes = new Set<number>();

  for (const hex of ctx.mapHexes) {
    // 1. Nation hexes
    if (hex.owner === nation.id) {
      hexes.add(hex.id);
    }

    // 2. Empty hexes
    if (!hex.owner) {
      hexes.add(hex.id);
    }

    // 3. Enemy hexes
    if (hex.owner && nation.atWar.includes(hex.owner)) {
      hexes.add(hex.id);
    }
  }

  return [...hexes];
}

export function calcHexDist(hex1: Hex, hex2: Hex) {
  const dist1 = axialToCube(hex1.q, hex1.r);
  const dist2 = axialToCube(hex2.q, hex2.r);
  return cubeDistance(dist1, dist2);
}

export function getDeltaAxial(
  startAxial: { q: number; r: number },
  endAxial: { q: number; r: number }
) {
  return { dq: endAxial.q - startAxial.q, dr: endAxial.r - startAxial.r };
}

export function transferHexOwnership(ctx: GameCtx, hexId: number, toNationId: string) {
  const hexIdMap = getHexIdMap(ctx);
  const buildingIdMap = getBuildingsByIdMap(ctx);

  const hex = hexIdMap.get(hexId);
  if (!hex) return { ok: false };

  const currOwner = hex.owner;

  const nation = ctx.nations.find((n) => n.id === toNationId);
  if (!nation) return { ok: false };

  const building = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;
  if (hex.buildingId && !building) return { ok: false };

  if (currOwner !== nation.id) {
    // reset queued buildings
    hex.build_queue = null;

    // reset contracts if building in hex
    if (building && building.contracts) {
      building.contracts = undefined;
    }
  }

  // push non-allowed armies to their closest owned land (or delete if no path found)
  const notAllowed = new Set(ctx.nations.filter((n) => n.id !== nation.id).map((n) => n.id));
  for (const army of hex.army) {
    if (notAllowed.has(army.nationId)) {
      // build path to closest nation owned hex and transfer army
    }
  }

  hex.owner = nation.id;
  return { ok: true };
}
