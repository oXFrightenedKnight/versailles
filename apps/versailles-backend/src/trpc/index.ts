import z from "zod";
import { authedProcedure, router } from "./trpc.js";
import { calculatePopulationChange, generateHexMap } from "../services/map.js";
import { BUILDINGS, Hex, MAP_RADIUS } from "../lib/map_data.js";
import { memoryStore } from "../server/memoryStore.js";
import { Nation, NATION_NAMES } from "../lib/nations.js";
import { buildNationBuildings, generateNations, newBuildings } from "../services/genNations.js";
import { TRPCError } from "@trpc/server";
import { moveArmy } from "../services/army.js";

export const appRouter = router({
  // Init game
  generateHexMap: authedProcedure.mutation(async () => {
    let mapHexes: Hex[] = [];
    let nations: Nation[] = [];
    let turn: number = 0;

    if (memoryStore.maps.has("mapHexes")) {
      mapHexes = memoryStore.maps.get("mapHexes");
    } else {
      mapHexes = generateHexMap(MAP_RADIUS);
      memoryStore.maps.set("mapHexes", mapHexes);
    }

    if (memoryStore.maps.has("nations")) {
      nations = memoryStore.maps.get("nations");
    } else {
      nations = generateNations();
      memoryStore.maps.set("nations", nations);
    }

    if (memoryStore.maps.has("turn")) {
      turn = memoryStore.maps.get("turn");
    } else {
      memoryStore.maps.set("turn", 0);
    }

    return { mapHexes, nations, turn };
  }),
  nextTurn: authedProcedure
    .input(
      z.object({
        newQueuedBuildings: z.array(
          z.object({
            hexId: z.number(),
            building: z.string(),
          })
        ),
        movePlayerArmy: z.array(
          z.object({
            hexId: z.number(),
            amount: z.number(),
            direction: z.object({
              dq: z.number(),
              dr: z.number(),
            }),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let mapHexes: Hex[] = memoryStore.maps.get("mapHexes");
      const nations: Nation[] = memoryStore.maps.get("nations");
      let turn: number = memoryStore.maps.get("turn");
      const playerNationId = nations.find((nation) => nation.isPlayer)?.id;

      console.log(mapHexes, nations, turn);

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

      // increase turn
      turn++;
      memoryStore.maps.set("turn", turn);

      // step 1: calculate ai decisions (build, attack, move)

      // step 1.5: queue buildings that are going to be built & finish building
      for (const nation of nations) {
        if (!nation.isPlayer) continue; // only allow player for now
        if (!input.newQueuedBuildings.every((obj) => Object.keys(BUILDINGS).includes(obj.building)))
          throw new TRPCError({ code: "NOT_FOUND" });
        mapHexes = buildNationBuildings({
          nation: nation,
          mapHexes: mapHexes,
          newBuildings: input.newQueuedBuildings as newBuildings,
        });
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

      // step 4: calculate population growth
      mapHexes = calculatePopulationChange(mapHexes);

      // step 5: calculate gold & building output

      // step 6: update values in memory store
      memoryStore.maps.set("mapHexes", mapHexes);
      return { turn };
    }),
  readNations: authedProcedure.query(async () => {
    const nations: Nation[] = memoryStore.maps.get("nations");

    if (!nations) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (memoryStore.maps.has("nations")) {
      const allIds = nations.map((nation: Nation) => nation.id);

      const filtered_nations = Object.fromEntries(
        Object.entries(NATION_NAMES).filter(([_, value]) => allIds.includes(value))
      );

      return filtered_nations;
    }
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
