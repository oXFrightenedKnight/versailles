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
import { inferProcedureInput } from "@trpc/server";
import { MemoryCtx } from "../services/ai/memory/types.js";
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
export declare const emptyIntentCtx: IntentInput;
export type NextTurnType = inferProcedureInput<AppRouter["nextTurn"]>;
export type IntentInput = NextTurnType["playerIntents"];
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
    initialLoad: import("@trpc/server").TRPCQueryProcedure<{
      input: {
        gameId: string;
      };
      output: {
        mails: Mail[];
        mapHexes: Hex[];
        nations: Nation[];
        turn: number;
        roads: Road[];
        buildings: Building[];
        contracts: SupplyContract[];
        armyTraining: ArmyTrainingObject[];
      } | null;
      meta: object;
    }>;
    nextTurn: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        gameId: string;
        playerIntents: {
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
          readMails: string[];
          answeredMails: {
            id: string;
            answer: boolean;
          }[];
          signPeaceReq: string[];
        };
      };
      output: {
        mails: Mail[];
        mapHexes: Hex[];
        nations: Nation[];
        turn: number;
        roads: Road[];
        buildings: Building[];
        contracts: SupplyContract[];
        armyTraining: ArmyTrainingObject[];
      } | null;
      meta: object;
    }>;
    createNewGame: import("@trpc/server").TRPCMutationProcedure<{
      input: void;
      output: {
        id: string;
        metadata: {
          createdAt: string;
          updatedAt: string;
          turn: number;
          playerNationId: string | undefined;
          nationsLeft: number;
        };
      };
      meta: object;
    }>;
    loadPlayerGames: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        id: string;
        userId: string;
        version: number;
        metadata: {
          createdAt: string;
          updatedAt: string;
          turn: number;
          playerNationId: string | undefined;
          nationsLeft: number;
        };
        data: GameCtx;
      }[];
      meta: object;
    }>;
  }>
>;
export type AppRouter = typeof appRouter;
