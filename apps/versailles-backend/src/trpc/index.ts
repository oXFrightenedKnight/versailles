import { Building, Hex, Mail, MODIFIER, Nation, Road } from "@repo/shared";

import { inferProcedureInput, TRPCError } from "@trpc/server";
import z from "zod";
import {
  createNewGame,
  getPlayerSaves,
  memoryStore,
  populateGameCtx,
  updateStore,
} from "../server/memoryStore.js";
import { buildingOutput, giveProgressBuilding } from "../services/buildings.js";
import { executeContracts, recalculateContractsAmounts } from "../services/contracts.js";

import { nationsUpdateManpower } from "../services/manpower.js";
import { filterPlayerLogic, updatePlayerUI } from "../services/player.js";
import { authedProcedure, router } from "./trpc.js";
import { runIntentForEachNation } from "../services/intents/executeIntents.js";
import { mailsExpire } from "../services/mails.js";
import { runAIDiplomacy, runNationDiplomacy } from "../services/intents/diplomacyIntents.js";
import { MemoryCtx } from "../services/ai/memory/types.js";
import { runAIPipeline } from "#services/ai/main.js";
import { peaceCountdown } from "#services/army/war.js";

export type GameCtx = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  modifiers: MODIFIER[];
  mails: Mail[];
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

      const ctx = populateGameCtx({ gameId, userId: reqCtx.clerkId });
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
      const gameCtx = populateGameCtx({ userId: ctx.clerkId, gameId });
      if (!gameCtx) throw new TRPCError({ code: "NOT_FOUND" });

      const playerIntentCtx: IntentInput = {
        ...input.playerIntents,
      };

      const playerNation = gameCtx.nations.find((nation) => nation.isPlayer);

      // checks
      if (!playerNation) throw new TRPCError({ code: "NOT_FOUND" });

      // step 0.5: run player diplomacy first
      runNationDiplomacy(gameCtx, playerNation, playerIntentCtx);

      // step 1: calculate ai decisions (build, attack, move)
      // merge ai intents in here later
      const intents: { input: IntentInput; nationId: string }[] = [
        { input: playerIntentCtx, nationId: playerNation.id },
      ];

      for (const nation of gameCtx.nations) {
        if (nation.isPlayer) continue;

        try {
          const aiIntents = runAIPipeline(gameCtx, nation);
          intents.push({
            input: {
              ...emptyIntentCtx,
              ...aiIntents,
            },
            nationId: nation.id,
          });
        } catch (err) {
          console.log("AI Pipeline failed for", nation.id, err);
        }
      }

      // step 1.5: run ai diplomacy
      runAIDiplomacy(gameCtx, intents);

      // step 2: apply intents
      runIntentForEachNation(gameCtx, intents);

      // step 3: calculate battle outcomes

      // step 3.5: give progress to buildings in queue
      giveProgressBuilding(gameCtx);

      // step 4: calculate contracts
      executeContracts(gameCtx);

      // step 5: calculate gold & building output
      buildingOutput(gameCtx);

      // step 6: recalculate all auto-adjust contracts to match new state
      recalculateContractsAmounts(gameCtx);

      // step 7: recalculate manpower
      nationsUpdateManpower(gameCtx);

      // step 8: update peace countdown
      peaceCountdown(gameCtx);

      // step 9: expire mails
      mailsExpire(gameCtx);

      // step 9: update player UI states
      updatePlayerUI(gameCtx, playerIntentCtx, playerNation);

      // step 10: increase turn
      // fine for now, but when adding db/reddis, consider special
      // functions to update state
      gameCtx.turn++;

      // step 11: update store / db
      updateStore({ gameId, userId: ctx.clerkId, gameCtx });

      // step 12: filter logic for player
      const data = filterPlayerLogic(gameCtx);
      return data;
    }),
  createNewGame: authedProcedure.mutation(async ({ ctx }) => {
    const game = createNewGame(ctx.clerkId);
    return { id: game.id, metadata: game.metadata };
  }),
  loadPlayerGames: authedProcedure.query(async ({ ctx }) => {
    return getPlayerSaves(ctx.clerkId);
  }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
