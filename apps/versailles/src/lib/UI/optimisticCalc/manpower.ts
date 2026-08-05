import { ArmyTraining } from "@/lib/types/game";
import { getNationResource } from "@repo/shared";
import { Nation } from "@repo/shared/data/nations";

export function calculateOptimisticManpower(
  armyTraining: ArmyTraining[],
  playerNation: Nation | null
) {
  let totalArmy = 0;
  for (const army of armyTraining) {
    totalArmy += army.amount;
  }

  const playerManpower = playerNation ? getNationResource(playerNation, "manpower") : 0;

  return playerManpower ? playerManpower - totalArmy : 0;
}
