import { GameCtx } from "../../../trpc";
import { SelfData, WorldAnalysis, WorldData } from "./types";
import {
  getNationHexCount,
  getNationNeighbors,
  getNationsAtPeace,
  getNationsAtWar,
} from "../world/nations";
import { getNationArmyInHexes, getNeighborArmies } from "../world/armies";
import { getFrontlines } from "../world/map";
import { getConstructing } from "../world/buildings";
import { getNeighborEconomyRatio } from "./economy";
import { getBorderBFS } from "../../algorithms/bfs.js";
import { getNationBuildingCount } from "../../buildings/queries.js";
import { getNationArmy } from "#simulation/nations/queries";
import { getNationBorderHexes, getBorderHexes } from "#simulation/world/map/queries";

export function AIWorldAnalysis({
  ctx,
  nationId,
}: {
  ctx: GameCtx;
  nationId: string;
}): WorldAnalysis | null {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return null;

  const worldData: WorldData = {
    nationsAtWar: getNationsAtWar(ctx),
    nationsAtPeace: getNationsAtPeace(ctx),
    neighborArmies: getNeighborArmies(ctx, nation),
    neighbors: getNationNeighbors(ctx, nation),
    neighborEconomyRatio: getNeighborEconomyRatio(ctx, nation),
    currentFrontlines: getFrontlines(ctx, nation),
    currentBorders: getNationBorderHexes(ctx, nation.id), // hexes of this nation that border others
    borderingHexes: getBorderHexes(ctx, nation.id), // hexes that this nation borders
  };
  const selfData: SelfData = {
    ownedHexCount: getNationHexCount(ctx, nation),
    totalArmy: getNationArmy(ctx, nation.id) ?? 0,
    armyInHexes: getNationArmyInHexes(ctx, nation),
    buildingCounts: getNationBuildingCount(ctx, nation.id),
    constructing: getConstructing(ctx, nation),
    borderBFS: getBorderBFS(ctx, nation),
  };

  const worldAnalysis: WorldAnalysis = { worldData, selfData };
  return worldAnalysis;
}
