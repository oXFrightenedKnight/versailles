import { runGameSimulation } from "../simulation/game.js";
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
import { createNewGame, getGame, getPlayerSaves, updateGameSave } from "../server/memoryStore.js";
import { MemoryCtx } from "../simulation/ai/memory/types.js";
import { filterPlayerLogic } from "../simulation/player.js";
import { authedProcedure, router } from "./trpc.js";
import { getOrCreateUser } from "#services/user.js";

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
  counters: ServerSequnceState;
};
export type ServerSequnceState = {
  nextMailCreationIndex: number;
  nextContractExecutionOrder: number;
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

      const user = await getOrCreateUser(reqCtx.clerkId);

      const saveData = await getGame({ gameId, userId: user.id });
      if (!saveData || !saveData.data) throw new TRPCError({ code: "NOT_FOUND" });

      // FILTERING/FOG OF WAR LOGIC
      const data = filterPlayerLogic(saveData.data);

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

      const user = await getOrCreateUser(ctx.clerkId);

      const saveData = await getGame({ userId: user.id, gameId });
      const gameCtx = saveData?.data;
      if (!saveData || !gameCtx) throw new TRPCError({ code: "NOT_FOUND" });

      // start game simulation
      runGameSimulation(gameCtx, input);

      // update db
      updateGameSave({ gameId, userId: user.id, gameCtx, currVersion: saveData.version });

      // filter world state for player
      const data = filterPlayerLogic(gameCtx);

      return data;
    }),
  createNewGame: authedProcedure.mutation(async ({ ctx }) => {
    const user = await getOrCreateUser(ctx.clerkId);

    const { gameId, metadata } = await createNewGame(user.id);

    return { id: gameId, metadata: metadata };
  }),
  loadPlayerGames: authedProcedure.query(async ({ ctx }) => {
    const user = await getOrCreateUser(ctx.clerkId);
    return await getPlayerSaves(user.id);
  }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
