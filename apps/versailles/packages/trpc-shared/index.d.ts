import { Hex, Nation } from "@repo/shared";
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<
  {
    ctx: {
      clerkId: string | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
  },
  import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    generateHexMap: import("@trpc/server").TRPCMutationProcedure<{
      input: void;
      output: {
        mapHexes: Hex[];
        nations: Nation[];
        turn: number;
      };
      meta: object;
    }>;
    nextTurn: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        newQueuedBuildings: {
          hexId: number;
          building: string;
        }[];
        movePlayerArmy: {
          hexId: number;
          amount: number;
          direction: {
            dq: number;
            dr: number;
          };
        }[];
        buildRoads: {
          id: string;
          points: { q: number; r: number }[];
        }[];
      };
      output: {
        turn: number;
      };
      meta: object;
    }>;
  }>
>;
export type AppRouter = typeof appRouter;
