import { NationResourceTable } from "@repo/shared";

export type BaseTrainingProjection = {
  key: string;

  barrackId: string;
  amount: number;
};

export type TrainingProjection =
  | (BaseTrainingProjection & {
      source: "server";

      trainingId: string;
      progress: number;
      nationId: string;

      optimisticRefund: NationResourceTable;
    })
  | (BaseTrainingProjection & {
      source: "pending";
      actionId: string;
    });
