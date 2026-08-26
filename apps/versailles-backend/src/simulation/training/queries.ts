import { ArmyTrainingObject } from "@repo/shared/training";

export function getBuildingTraining(
  { armyTraining }: { armyTraining: ArmyTrainingObject[] },
  buildingId: string
) {
  return armyTraining.filter((a) => a.barrackId === buildingId);
}
