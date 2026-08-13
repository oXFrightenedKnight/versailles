import {
  ArmyTrainingObject,
  Building,
  Hex,
  Mail,
  Nation,
  Road,
  SupplyContract,
} from "@repo/shared";

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
      };
      meta: object;
    }>;
    nextTurn: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        gameId: string;
        actions: (
          | {
              id: string;
              type: "building.build";
              hexId: number;
              buildingType: "CIVILIAN" | "BARRACK" | "FARM" | "WATCHTOWER" | "WOODCAMP";
              levelsToUpgrade: number;
            }
          | {
              id: string;
              type: "road.build";
              points: {
                q: number;
                r: number;
                d1: number;
                d2: number;
              }[];
            }
          | {
              id: string;
              type: "contract.create";
              contractId: string;
              startBuildingId: string;
              endBuildingId: string;
              amount: number;
              resource: "wheat" | "wood";
              autoAdjust: boolean;
            }
          | {
              id: string;
              type: "contract.update";
              contractId: string;
              changes: {
                amount?: number | undefined;
                resource?: "wheat" | "wood" | undefined;
                autoAdjust?: boolean | undefined;
              };
            }
          | {
              id: string;
              type: "mails.answer";
              mailId: string;
              answer: boolean;
            }
          | {
              id: string;
              type: "mails.read";
              mailId: string;
            }
          | {
              id: string;
              type: "diplomacy.peace";
              nationId: string;
            }
          | {
              id: string;
              type: "diplomacy.war";
              nationId: string;
            }
          | {
              id: string;
              type: "army.move";
              nationId: string;
              hexId: number;
              amount: number;
              direction: {
                dq: number;
                dr: number;
              };
            }
          | {
              id: string;
              type: "road.cancel";
              roadId: string;
            }
          | {
              id: string;
              type: "building.cancel";
              hexId: number;
            }
          | {
              id: string;
              type: "building.delete";
              buildingId: string;
            }
          | {
              id: string;
              type: "contract.delete";
              contractId: string;
            }
          | {
              id: string;
              type: "army.train.delete";
              trainingId: string;
            }
          | {
              id: string;
              type: "army.train";
              amount: number;
              barrackId: string;
            }
        )[];
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
      };
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
      }[];
      meta: object;
    }>;
  }>
>;
export type AppRouter = typeof appRouter;
