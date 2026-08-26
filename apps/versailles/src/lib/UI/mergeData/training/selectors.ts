import { PendingAction } from "@/lib/types/actions";
import { TrainingProjection } from "./types";
import { StoreType } from "@/lib/stores/intentStore";
import { ArmyTrainingObject, getArmyTrainCost } from "@repo/shared/training";
import { invertResourceTable } from "@repo/shared/resources";

export function selectTrainings(
  armyTraining: ArmyTrainingObject[],
  pendingActions: PendingAction[]
): TrainingProjection[] {
  const byTrainingId = new Map<string, TrainingProjection>();

  const canceledTrainingIds = new Set(
    pendingActions.flatMap(({ action }) =>
      action.type === "army.train.delete" ? [action.trainingId] : []
    )
  );

  // start with authoritative server queues
  for (const training of armyTraining) {
    if (canceledTrainingIds.has(training.id)) {
      continue;
    }

    const refund = Math.max(0, getArmyTrainCost(training.amount));

    byTrainingId.set(training.id, {
      key: `training:${training.id}`,
      source: "server",

      barrackId: training.barrackId,
      amount: training.amount,

      progress: training.progress,
      trainingId: training.id,
      nationId: training.nationId,

      optimisticRefund: { gold: refund },
    });
  }

  // Overlay pending building actions.
  for (const pendingAction of pendingActions) {
    const action = pendingAction.action;

    if (action.type !== "army.train") {
      continue;
    }

    const tempId = crypto.randomUUID();

    byTrainingId.set(tempId, {
      key: `training:${tempId}`,
      source: "pending",

      barrackId: action.barrackId,
      amount: action.amount,

      actionId: action.id,
    });
  }

  return [...byTrainingId.values()];
}

export function setArmyTraining(
  barrackId: string,
  amount: number,
  createGameAction: StoreType["createGameAction"]
) {
  const cost = getArmyTrainCost(amount);

  createGameAction({
    action: { type: "army.train", id: crypto.randomUUID(), barrackId, amount },
    resourceDelta: invertResourceTable({ gold: cost }),
  });
}

export function cancelArmyTraining(
  projection: TrainingProjection,
  deleteGameAction: StoreType["deleteGameAction"],
  createGameAction: StoreType["createGameAction"]
) {
  if (projection.source === "server") {
    createGameAction({
      action: {
        type: "army.train.delete",
        id: crypto.randomUUID(),

        trainingId: projection.trainingId,
      },

      resourceDelta: projection.optimisticRefund,
    });
  }

  if (projection.source === "pending") {
    deleteGameAction(projection.actionId);
  }
}
