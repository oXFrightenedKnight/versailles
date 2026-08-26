import { calculateModifiers } from "#simulation/modifiers";
import { adjustNationResource } from "#simulation/resources/production";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { getNationResource } from "@repo/shared/resources";
import { MANPOWER_RATE } from "@repo/shared/training";

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
  const newManpower = Math.round(baseManpower + modManpower);
  const currentManpower = getNationResource(nation, "manpower");
  const delta = newManpower - currentManpower;
  adjustNationResource(nation, "manpower", delta);
}

export function nationsUpdateManpower(gameCtx: GameCtx) {
  const { nations } = gameCtx;
  // update manpower for every nation
  for (const nation of nations) {
    calculateManpower({ nation, gameCtx });
  }
}
