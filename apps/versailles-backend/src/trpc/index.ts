import z from "zod";
import { authedProcedure, router } from "./trpc.js";
import { generateHexMap } from "../services/map.js";
import { memoryStore } from "../server/memoryStore.js";
import {
  buildNationBuildings,
  executeIntents,
  generateNations,
  newBuildings,
  runIntentForEachNation,
} from "../services/genNations.js";
import { inferProcedureInput, TRPCError } from "@trpc/server";
import { declareWar, moveArmy, queueArmyTraining } from "../services/army.js";
import {
  ALL_BUILDING_CATEGORIES,
  Building,
  BUILDINGS_CATEGORY,
  Hex,
  MAP_RADIUS,
  MODIFIER,
  Nation,
  RESOURCES,
  Road,
} from "@repo/shared";
import {
  createContracts,
  executeContracts,
  recalculateContractsAmounts,
} from "../services/contracts.js";
import { buildingOutput } from "../services/buildings.js";
import { nationsUpdateManpower } from "../services/manpower.js";
import { buildNationRoads } from "../services/road.js";

export type GameCtx = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  modifiers: MODIFIER[];
};

export type IntentInput = inferProcedureInput<AppRouter["nextTurn"]>;

export const appRouter = router({
  // Init game
  generateHexMap: authedProcedure.mutation(async () => {
    let mapHexes: Hex[] = [];
    let nations: Nation[] = [];
    let turn: number = 0;
    let roads: Road[] = [];
    let buildings: Building[] = [];
    let modifiers: MODIFIER[] = [];

    if (memoryStore.maps.has("mapHexes")) {
      mapHexes = memoryStore.maps.get("mapHexes");
    } else {
      mapHexes = generateHexMap(MAP_RADIUS, buildings);
      memoryStore.maps.set("mapHexes", mapHexes);
    }

    if (memoryStore.maps.has("nations")) {
      nations = memoryStore.maps.get("nations");
    } else {
      nations = generateNations({ buildings });
      memoryStore.maps.set("nations", nations);
    }

    if (memoryStore.maps.has("turn")) {
      turn = memoryStore.maps.get("turn");
    } else {
      memoryStore.maps.set("turn", turn);
    }

    if (memoryStore.maps.has("roads")) {
      roads = memoryStore.maps.get("roads");
    } else {
      memoryStore.maps.set("roads", roads);
    }

    if (memoryStore.maps.has("buildings")) {
      buildings = memoryStore.maps.get("buildings");
    } else {
      memoryStore.maps.set("buildings", buildings);
    }

    if (memoryStore.maps.has("modifiers")) {
      modifiers = memoryStore.maps.get("modifiers");
    } else {
      memoryStore.maps.set("modifiers", modifiers);
    }

    return { mapHexes, nations, turn, roads, buildings };
  }),
  nextTurn: authedProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      // create gameCtx
      const gameCtx: GameCtx = {
        mapHexes: memoryStore.maps.get("mapHexes"),
        nations: memoryStore.maps.get("nations"),
        turn: memoryStore.maps.get("turn"),
        roads: memoryStore.maps.get("roads"),
        buildings: memoryStore.maps.get("buildings"),
        modifiers: memoryStore.maps.get("modifiers"),
      };
      const playerIntentCtx: IntentInput = {
        ...input,
      };

      const playerNationId = gameCtx.nations.find((nation) => nation.isPlayer)?.id;

      // checks
      if (
        !gameCtx.mapHexes ||
        gameCtx.mapHexes.length === 0 ||
        !gameCtx.nations ||
        gameCtx.nations.length === 0 ||
        gameCtx.turn === undefined
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!playerNationId) throw new TRPCError({ code: "NOT_FOUND" });

      // step 1: calculate ai decisions (build, attack, move)

      // step 2: apply intents
      // merge ai intents in here later
      const intents = [{ input: playerIntentCtx, nationId: playerNationId }];
      runIntentForEachNation(gameCtx, intents);

      // step 3: calculate battle outcomes

      // step 4: calculate contracts
      executeContracts(gameCtx);

      // step 5: calculate gold & building output
      buildingOutput(gameCtx);

      // step 6: recalculate all auto-adjust contracts to match new state
      recalculateContractsAmounts(gameCtx);

      // step 7: recalculate manpower
      nationsUpdateManpower(gameCtx);

      // step 8: increase turn
      gameCtx.turn++;
      memoryStore.maps.set("turn", gameCtx.turn);

      // step 9: update values in memory store
      memoryStore.maps.set("mapHexes", gameCtx.mapHexes);
      memoryStore.maps.set("roads", gameCtx.roads);
      memoryStore.maps.set("nations", gameCtx.nations);
      memoryStore.maps.set("buildings", gameCtx.buildings);
      memoryStore.maps.set("modifiers", gameCtx.modifiers);
    }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
