import { Building, Hex } from "@repo/shared";
import { getBuildingConfig, baseTrainingProgress } from "@repo/shared/buildings";
import { addArmy } from "../army/commands";
import { deleteTrainInstance } from "./commands";
import { getBuildingTraining } from "./queries";
import { GameCtx } from "#trpc";

// gives training progress and deploys ready armies
export function runBuildingTraining(
  ctx: GameCtx,
  building: Building,
  hex: Hex,
  efficiency: number
) {
  const config = getBuildingConfig(building);
  if (!config?.systems?.armyTraining) return;
  const maxTraining = config.systems.armyTraining.maxTraining ?? 0;

  const training = getBuildingTraining(ctx, building.id);

  let amountTrained = 0; // add progress to every training contract until reached cap

  const deleteFinished: string[] = [];
  if (training && training.length > 0) {
    for (const trainInstance of training) {
      if (amountTrained >= maxTraining) break;

      const trainingAvailable = Math.min(trainInstance.amount, maxTraining - amountTrained);
      const progress = baseTrainingProgress * trainingAvailable * efficiency;

      console.log(
        `training progress gain at ${hex.id} for amount ${trainingAvailable} of ${trainInstance.nationId} with eff ${efficiency}: `,
        progress
      );

      trainInstance.progress += progress;
      amountTrained += trainingAvailable;

      // if progress is full, deploy army
      if (trainInstance.progress >= trainInstance.amount) {
        addArmy({
          ctx,
          nationId: trainInstance.nationId,
          hexId: hex.id,
          amount: trainInstance.amount,
        });

        // add index to delete after loop
        deleteFinished.push(trainInstance.id);
      }
    }

    // delete armies that finished training and deployed
    for (const id of deleteFinished) {
      deleteTrainInstance(ctx, id);
    }
  }

  return { ok: true };
}
