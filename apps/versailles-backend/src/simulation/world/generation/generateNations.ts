import { GameCtx } from "#trpc";
import { AVAILABLE_TILES } from "@repo/shared/map";
import { BASE_NATION_GOLD, NATION_NAMES, NATION_NUMBER } from "@repo/shared/nations";
import { addArmy } from "../../army/commands";
import { BuildBuilding } from "../../buildings/construction";
import { getHexById } from "../map/queries";
import { addPopulation } from "./populateWorld";
import { createNewNation } from "#simulation/nations/creation";

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

export function assignRandomPlayer(ctx: GameCtx) {
  const availableNations = ctx.nations.filter((n) => !n.isPlayer);
  if (availableNations.length === 0) return;

  const randomIndex = Math.floor(Math.random() * availableNations.length);

  const nation = availableNations[randomIndex];

  nation.isPlayer = true;
}
