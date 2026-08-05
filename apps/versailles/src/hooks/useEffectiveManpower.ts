import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { calculateOptimisticManpower } from "@/lib/UI/optimisticCalc/manpower";
import { useMemo } from "react";

export function useEffectiveManpower() {
  const playerNation = useGameStore((s) => s.playerNation);

  const armyTraining = useIntentStore((s) => s.armyTraining);

  return useMemo(() => {
    return calculateOptimisticManpower(armyTraining, playerNation);
  }, [playerNation, armyTraining]);
}
