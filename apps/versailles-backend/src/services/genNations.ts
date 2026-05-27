import {
  AVAILABLE_TILES,
  BASE_NATION_GOLD,
  BUILDINGS_CATEGORY,
  Hex,
  Nation,
  NATION_NAMES,
  NATION_NUMBER,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { addArmy } from "./army.js";
import { BuildBuilding } from "./buildings.js";
import { getHexById, randomNationColor } from "./map.js";

export type newBuildings = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
}[];

export function generateNations(ctx: GameCtx) {
  // choose nations and assign available spaces
  let availableTiles = [...AVAILABLE_TILES];
  let availableNations = Object.values(NATION_NAMES);

  for (let i = 0; i < NATION_NUMBER; i++) {
    const randomIdx = Math.floor(1 + Math.random() * availableNations.length) - 1;
    const randomTileIdx = Math.floor(1 + Math.random() * availableTiles.length) - 1;
    const agression = Math.random();
    const expansionBias = Math.random();

    const nationIdx = availableNations[randomIdx];
    availableNations.splice(randomIdx, 1);
    const tileIdx = availableTiles[randomTileIdx];
    availableTiles.splice(randomTileIdx, 1);

    createNewNation({
      ctx,
      nationId: nationIdx,
      capitalId: tileIdx,
      agression,
      expansionBias,
      baseGold: BASE_NATION_GOLD,
    });
  }

  // assign 1 random country to player
  assignRandomPlayer(ctx);

  // every country starts with a village (capital)
  for (const nation of ctx.nations) {
    if (nation.capitalTileIdx === null) continue;
    if (AVAILABLE_TILES.includes(nation.capitalTileIdx)) {
      const tile = getHexById(nation.capitalTileIdx, ctx);
      if (tile) {
        const randomPopulation = 750 + Math.floor(1 + Math.random() * 200);

        tile.owner = nation.id;

        BuildBuilding({ category: "CIVILIAN", ctx, hexId: tile.id, levels: 2 });
        addPopulation({ ctx, hexId: tile.id, amount: randomPopulation });
        addArmy({ ctx, nationId: nation.id, hexId: tile.id, amount: 100 });
      } else continue;
    }
  }
}

export function getNationById(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (nation) return nation;
  return null;
}

export function createNewNation({
  ctx,
  nationId,
  capitalId,
  agression,
  expansionBias,
  isPlayer,
  baseGold,
}: {
  ctx: GameCtx;
  nationId: string;
  capitalId: number;
  agression: number;
  expansionBias: number;
  isPlayer?: boolean;
  baseGold?: number;
}) {
  ctx.nations.push({
    id: nationId,
    capitalTileIdx: capitalId,
    color: randomNationColor(),
    aggression: agression,
    expansionBias: expansionBias,
    isPlayer: isPlayer ? isPlayer : false,
    atWar: [],
    atPeace: [],
    gold: baseGold ? baseGold : 0,
    manpower: 0,
  });
}

export function assignRandomPlayer(ctx: GameCtx) {
  const availableNations = ctx.nations.filter((n) => !n.isPlayer);
  if (availableNations.length === 0) return;

  const randomIndex = Math.floor(Math.random() * availableNations.length);

  const nation = availableNations[randomIndex];

  nation.isPlayer = true;
}

export function addPopulation({
  ctx,
  hexId,
  amount,
}: {
  ctx: GameCtx;
  hexId: number;
  amount: number;
}) {
  const hex = getHexById(hexId, ctx);

  if (!hex) return;
  if (amount <= 0) return;
  if (hex.population === null) return;

  hex.population += amount;
}

export function setDefeated(nation: Nation) {
  // place player logic here later (eg. set playerMode)
  nation.capitalTileIdx = null;
  nation.isDefeated = true;
}

export function subtractGold(ctx: GameCtx, nationId: string, amount: number) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return false;

  if (nation.gold >= amount && !(nation.gold < 0)) {
    nation.gold -= amount;
    return true;
  } else {
    return false;
  }
}

// assigns hex with highest population of owner to be new capital
export function assignNewCapital(ctx: GameCtx, nationId: string) {
  const nation = getNationById(ctx, nationId);
  if (!nation) return;
  const ownerHexes = ctx.mapHexes.filter((h) => h.owner === nationId);

  const newCapital = ownerHexes.reduce<Hex>((acc, h) => {
    return (h.population ?? 0) > (acc.population ?? 0) ? h : acc;
  }, ownerHexes[0]);

  nation.capitalTileIdx = newCapital.id;
}

export function getPlayerNation(ctx: GameCtx) {
  return ctx.nations.find((n) => n.isPlayer);
}

export function getNationArmy(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return null;

  return ctx.mapHexes.reduce((acc, h) => {
    const army = h.army.find((a) => a.nationId === nationId)?.amount ?? 0;
    return acc + army;
  }, 0);
}
