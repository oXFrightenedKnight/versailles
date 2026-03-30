import z from "zod";
import { authedProcedure, router } from "./trpc.js";
import { calculatePopulationChange, generateHexMap } from "../services/map.js";
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
  Nation,
  RESOURCES,
  Road,
} from "@repo/shared";
import { createContracts, executeContracts } from "../services/contracts.js";
import { buildingOutput } from "../services/buildings.js";

export const appRouter = router({
  // Init game
  generateHexMap: authedProcedure.mutation(async () => {
    let mapHexes: Hex[] = [];
    let nations: Nation[] = [];
    let turn: number = 0;
    let roads: Road[] = [];
    let buildings: Building[] = [];

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
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let mapHexes: Hex[] = memoryStore.maps.get("mapHexes");
      const nations: Nation[] = memoryStore.maps.get("nations");
      let turn: number = memoryStore.maps.get("turn");
      let roads: Road[] = memoryStore.maps.get("roads");
      let buildings: Building[] = memoryStore.maps.get("buildings");
      const playerNationId = nations.find((nation) => nation.isPlayer)?.id;
      const buildRoads = input.buildRoads;
      const createNewContracts = input.createNewContracts.map((c) => ({
        ...c,
        resource: c.resource as RESOURCES,
      }));

      // checks
      if (
        !mapHexes ||
        mapHexes.length === 0 ||
        !nations ||
        nations.length === 0 ||
        turn === undefined
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!playerNationId) throw new TRPCError({ code: "NOT_FOUND" });

      // step 1: calculate ai decisions (build, attack, move)

      // step 1.5: queue buildings that are going to be built & finish building
      for (const nation of nations) {
        if (!nation.isPlayer) continue; // execute for player nation only
        // check if all new queued buildings categories exist
        if (
          !input.newQueuedBuildings.every((obj) =>
            ALL_BUILDING_CATEGORIES.includes(obj.buildingType as BUILDINGS_CATEGORY)
          )
        )
          throw new TRPCError({ code: "NOT_FOUND" });
        mapHexes = buildNationBuildings({
          nation: nation,
          mapHexes: mapHexes,
          newBuildings: input.newQueuedBuildings as newBuildings,
          buildings: buildings,
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
        roads = buildNationRoads({ nation, mapHexes, buildRoads: roadsToBuild, roads, buildings });
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
          mapHexes: mapHexes,
        });
      }
      // ai movement

      // step 3: calculate battle outcomes

      // step 4: create & calculate contract exports
      createContracts({ contracts: createNewContracts, buildings, mapHexes, roads });
      executeContracts({ buildings });

      // step 5: calculate gold & building output
      buildingOutput(buildings, mapHexes, nations);

      // step 6: increase turn
      turn++;
      memoryStore.maps.set("turn", turn);

      // step 7: update values in memory store
      memoryStore.maps.set("mapHexes", mapHexes);
      memoryStore.maps.set("roads", roads);
      memoryStore.maps.set("nations", nations);
      memoryStore.maps.set("buildings", buildings);
      return { turn };
    }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
