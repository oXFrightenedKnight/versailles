import {
  ArmyTrainingObject,
  Building,
  gameActionSchema,
  Hex,
  Mail,
  MODIFIER,
  Nation,
  Road,
  SupplyContract,
} from "@repo/shared";

import { inferProcedureInput, TRPCError } from "@trpc/server";
import z from "zod";
import { createNewGame, getPlayerSaves, getSaveData, updateStore } from "../server/memoryStore.js";

import { runGameSimulation } from "#services/game.js";
import { MemoryCtx } from "../services/ai/memory/types.js";
import { filterPlayerLogic } from "../services/player.js";
import { authedProcedure, router } from "./trpc.js";

export type GameCtx = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  modifiers: MODIFIER[];
  mails: Mail[];
  contracts: SupplyContract[];
  armyTraining: ArmyTrainingObject[];
  aiMemory: MemoryCtx;
};

export type NextTurnType = inferProcedureInput<AppRouter["nextTurn"]>;

export const appRouter = router({
  // Init game
  initialLoad: authedProcedure
    .input(
      z.object({
        gameId: z.string(),
      })
    )
    .query(async ({ input, ctx: reqCtx }) => {
      const gameId = input.gameId;

      const saveData = getSaveData({ gameId, userId: reqCtx.clerkId });
      const ctx = saveData?.data;
      if (!ctx) throw new TRPCError({ code: "NOT_FOUND" });

      // FILTERING/FOG OF WAR LOGIC
      const data = filterPlayerLogic(ctx);

      return data;
    }),
  nextTurn: authedProcedure
    .input(
      z.object({
        gameId: z.string(),
        actions: z.array(gameActionSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // create gameCtx
      const gameId = input.gameId;
      const saveData = getSaveData({ userId: ctx.clerkId, gameId });
      const gameCtx = saveData?.data;
      if (!gameCtx) throw new TRPCError({ code: "NOT_FOUND" });

      // start game simulation
      runGameSimulation(gameCtx, input);

      // update store / db
      updateStore({ gameId, userId: ctx.clerkId, gameCtx, currVersion: saveData.version });

      // filter world state for player
      const data = filterPlayerLogic(gameCtx);

      return data;
    }),
  createNewGame: authedProcedure.mutation(async ({ ctx }) => {
    const game = createNewGame(ctx.clerkId);

    // dev: run simulation for 300 turns
    for (let i = 0; i < 300; i++) {
      runGameSimulation(game.data, { gameId: game.id, actions: [] });
    }

    // update store / db
    updateStore({
      gameId: game.id,
      userId: ctx.clerkId,
      gameCtx: game.data,
      currVersion: game.version,
    });

    return { id: game.id, metadata: game.metadata };
  }),
  loadPlayerGames: authedProcedure.query(async ({ ctx }) => {
    return getPlayerSaves(ctx.clerkId);
  }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
