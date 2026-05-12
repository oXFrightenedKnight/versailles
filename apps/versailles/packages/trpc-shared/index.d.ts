import { inferProcedureInput } from "@trpc/server";
import { Building, Hex, Mail, MODIFIER, Nation, Road } from "@repo/shared";
export type GameCtx = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  modifiers: MODIFIER[];
  mails: Mail[];
};
export type IntentInput = inferProcedureInput<AppRouter["nextTurn"]>;
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
    initialLoad: import("@trpc/server").TRPCMutationProcedure<{
      input: void;
      output: {
        mails: Mail[];
        modifiers: MODIFIER[];
        mapHexes: Hex[];
        nations: Nation[];
        turn: number;
        roads: Road[];
        buildings: Building[];
      } | null;
      meta: object;
    }>;
    nextTurn: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        newQueuedBuildings: {
          hexId: number;
          buildingType: string;
          levelsToUpgrade: number;
        }[];
        buildingCancel: number[];
        buildingDelete: string[];
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
          points: {
            q: number;
            r: number;
            d1: number;
            d2: number;
          }[];
        }[];
        cancelRoadBuild: string[];
        createNewContracts: {
          startBuildingId: string;
          endBuildingId: string;
          amount: number;
          resource: string;
          autoAdjust: boolean;
        }[];
        deleteContracts: string[];
        updateContracts: {
          contractId: string;
          changes: {
            amount?: number | undefined;
            resource?: string | undefined;
            autoAdjust?: boolean | undefined;
          };
        }[];
        trainNewArmy: {
          amount: number;
          barrackId: string;
        }[];
        deleteArmyTrain: string[];
        declareWar: string[];
      };
      output: {
        mails: Mail[];
        modifiers: MODIFIER[];
        mapHexes: Hex[];
        nations: Nation[];
        turn: number;
        roads: Road[];
        buildings: Building[];
      } | null;
      meta: object;
    }>;
  }>
>;
export type AppRouter = typeof appRouter;
