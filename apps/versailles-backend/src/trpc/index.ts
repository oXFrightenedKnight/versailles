import {
  ArmyTrainingObject,
  Building,
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

// change later so server does not expect full intent input. Skip running intent if there is none
export const emptyIntentCtx: IntentInput = {
  newQueuedBuildings: [],
  buildingCancel: [],
  buildingDelete: [],
  movePlayerArmy: [],
  signPeaceReq: [],
  buildRoads: [],
  cancelRoadBuild: [],
  createNewContracts: [],
  deleteContracts: [],
  updateContracts: [],
  trainNewArmy: [],
  deleteArmyTrain: [],
  declareWar: [],
  readMails: [],
  answeredMails: [],
};

export type NextTurnType = inferProcedureInput<AppRouter["nextTurn"]>;
export type IntentInput = NextTurnType["playerIntents"];

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
        playerIntents: z.object({
          newQueuedBuildings: z.array(
            z.object({
              hexId: z.int(),
              buildingType: z.string(),
              levelsToUpgrade: z.int().min(1),
            })
          ),
          buildingCancel: z.array(z.number()),
          buildingDelete: z.array(z.string()),
          movePlayerArmy: z.array(
            z.object({
              hexId: z.int(),
              amount: z.int(),
              direction: z.object({
                dq: z.int(),
                dr: z.int(),
              }),
            })
          ),
          buildRoads: z.array(
            z.object({
              id: z.string(),
              points: z.array(
                z.object({
                  q: z.int(),
                  r: z.int(),
                  d1: z.number(),
                  d2: z.number(),
                })
              ),
            })
          ),
          cancelRoadBuild: z.array(z.string()),
          createNewContracts: z.array(
            z.object({
              startBuildingId: z.string(), // export from
              endBuildingId: z.string(), // import to
              amount: z.int().min(0),
              resource: z.string(),
              autoAdjust: z.boolean(),
            })
          ),
          deleteContracts: z.array(z.string()),
          updateContracts: z.array(
            z.object({
              contractId: z.string(),
              changes: z.object({
                amount: z.number().optional(),
                resource: z.string().optional(),
                autoAdjust: z.boolean().optional(),
              }),
            })
          ),
          trainNewArmy: z.array(
            z.object({
              amount: z.int().min(0),
              barrackId: z.string(),
            })
          ),
          deleteArmyTrain: z.array(z.string()),
          declareWar: z.array(z.string()),
          readMails: z.array(z.string()),
          answeredMails: z.array(
            z.object({
              id: z.string(),
              answer: z.boolean(),
            })
          ),
          signPeaceReq: z.array(z.string()),
        }),
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
      runGameSimulation(game.data, { gameId: game.id, playerIntents: emptyIntentCtx });
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
