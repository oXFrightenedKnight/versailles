import z from "zod";
import { authedProcedure, router } from "./trpc.js";
import { generateHexMap } from "../services/map.js";
import { memoryStore } from "../server/memoryStore.js";
import {
  buildNationBuildings,
  buildNationRoads,
  generateNations,
  newBuildings,
} from "../services/genNations.js";
import { TRPCError } from "@trpc/server";
import { moveArmy } from "../services/army.js";
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
import { buildingOutput, queueArmyTraining } from "../services/buildings.js";
import { nationsUpdateManpower } from "../services/manpower.js";

export type GameCtx = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  modifiers: MODIFIER[];
};

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
        createNewContracts: z.array(
          z.object({
            startBuildingId: z.string(), // export from
            endBuildingId: z.string(), // import to
            amount: z.int().min(0),
            resource: z.string(),
            autoAdjust: z.boolean(),
          })
        ),
        trainNewArmy: z.array(
          z.object({
            amount: z.int().min(0),
            barrackId: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // create gameCtx
      const gameCtx: GameCtx = {
        mapHexes: memoryStore.maps.get("mapHexes"),
        nations: memoryStore.maps.get("nations"),
        turn: memoryStore.maps.get("turn"),
        roads: memoryStore.maps.get("roads"),
        buildings: memoryStore.maps.get("buildings"),
        modifiers: memoryStore.maps.get("modifiers"),
      };

      const playerNationId = gameCtx.nations.find((nation) => nation.isPlayer)?.id;
      const buildRoads = input.buildRoads;
      const createNewContracts = input.createNewContracts.map((c) => ({
        ...c,
        resource: c.resource as RESOURCES,
      }));
      const trainNewArmy = input.trainNewArmy;

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

      // step 1.5: queue buildings that are going to be built & finish building
      for (const nation of gameCtx.nations) {
        if (!nation.isPlayer) continue; // execute for player nation only
        // check if all new queued buildings categories exist
        if (
          !input.newQueuedBuildings.every((obj) =>
            ALL_BUILDING_CATEGORIES.includes(obj.buildingType as BUILDINGS_CATEGORY)
          )
        )
          throw new TRPCError({ code: "NOT_FOUND" });
        gameCtx.mapHexes = buildNationBuildings({
          nation: nation,
          gameCtx,
          newBuildings: input.newQueuedBuildings as newBuildings,
        });

        // build roads (only allow to build from building to building or road to building or road to road)
        const roadsToBuild = buildRoads.map((r) => ({
          ...r,
          points: r.points.map((p) => ({
            ...p,
            isConstructing: true,
          })),
          constructing: null,
        }));
        buildNationRoads({ gameCtx, buildRoads: roadsToBuild, nationId: nation.id });
      }

      try {
        // step 1.6: queue army training (player, then ai)
        queueArmyTraining({ trainNewArmy, nationId: playerNationId, gameCtx }); // for player country (client request)
        // map over all other ai nations and execute this function for each
      } catch (err) {
        throw new Error(`err: ${err}`);
      }

      // step 2: army movement (player + ai)
      // player first
      const movePlayerArmy = input.movePlayerArmy;

      for (const hexObj of movePlayerArmy) {
        moveArmy({
          hexId: hexObj.hexId,
          amount: hexObj.amount,
          direction: hexObj.direction,
          nationId: playerNationId,
          gameCtx,
        });
      }
      // ai movement

      // step 3: calculate battle outcomes

      // step 4: create & calculate contract exports
      createContracts({ contracts: createNewContracts, gameCtx });
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
