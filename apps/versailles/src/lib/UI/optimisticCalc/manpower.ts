import { ArmyTraining } from "@/lib/types/game";
import { Nation } from "@repo/shared/data/nations";

export function calculateOptimisticManpower(
  armyTraining: ArmyTraining[],
  playerNation: Nation | null
) {
  let totalArmy = 0;
  for (const army of armyTraining) {
    totalArmy += army.amount;
  }

  return playerNation?.manpower ? playerNation.manpower - totalArmy : 0;
}
