import { BUILDINGS_CATEGORY, NationResourceTable } from "@repo/shared";

export type BuildingConstructionProjection = {
  key: string;
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;

  ownerId: string;

  confirmed: {
    levels: number;
    progress: number;
    finishedPercentage: number;
    optimisticRefund: NationResourceTable;
  } | null;

  pending: {
    levels: number;
    actionIds: string[];
  };

  totalLevels: number;
};

type RoadConstructionBase = {
  key: string;
  hexIds: number[];

  totalPoints: number;
  constructingPoints: number;

  ownerId: string;
};

export type RoadConstructionProjection =
  | (RoadConstructionBase & {
      source: "server";
      roadId: string;

      progress: number; // value from 0 to 100

      optimisticRefund: NationResourceTable;
    })
  | (RoadConstructionBase & {
      source: "pending";
      actionId: string;
    });
