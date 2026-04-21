import { Hex, MANPOWER_RATE, Nation } from "@repo/shared";
import { calculateModifiers } from "./modifiers.js";
import { GameCtx } from "../trpc/index.js";

export function calculateManpower({ nation, gameCtx }: { nation: Nation; gameCtx: GameCtx }) {
  const { mapHexes } = gameCtx;

  const rate = MANPOWER_RATE;

  // calculate total nation population
  const nationHexes = mapHexes.filter((h) => h.owner === nation.id);

  if (!nationHexes) return;
  let totalPopulation = 0;

  for (const hex of nationHexes) {
    if (!hex.population) continue;
    totalPopulation += hex.population;
  }

  let baseManpower = totalPopulation * rate;

  // ADD MANPOWER MODIFIERS to manpower pool
  const modManpower = calculateModifiers({
    gameCtx,
    category: "manpower",
    baseValue: baseManpower,
    nationId: nation.id,
  });

  // sum all base and mod manpower
  nation.manpower = Math.round(baseManpower + modManpower);
}

export function nationsUpdateManpower(gameCtx: GameCtx) {
  const { nations } = gameCtx;
  // update manpower for every nation
  for (const nation of nations) {
    calculateManpower({ nation, gameCtx });
  }
}
