import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { getUIBuildings } from "@/lib/UI/mergeData/uiBuildings";
import { calculateOptimisticGold } from "@/lib/UI/optimisticCalc/gold";
import { useMemo } from "react";

export function useEffectiveGold() {
  const mapHexes = useGameStore((s) => s.mapHexes);
  const buildings = useGameStore((s) => s.buildings);
  const playerNation = useGameStore((s) => s.playerNation);
  const roads = useGameStore((s) => s.roads);

  const buildBuildings = useIntentStore((s) => s.buildBuildings);
  const serverBuildingsDelete = useIntentStore((s) => s.serverBuildingsDelete);
  const serverCancelBuilding = useIntentStore((s) => s.serverCancelBuilding);
  const buildRoads = useIntentStore((s) => s.buildRoads);
  const serverCancelRoadBuilding = useIntentStore((s) => s.serverCancelRoadBuilding);
  const armyTraining = useIntentStore((s) => s.armyTraining);

  const buildingsUI = useMemo(() => {
    return getUIBuildings(buildings, serverBuildingsDelete);
  }, [buildings, serverBuildingsDelete]);

  return useMemo(() => {
    return calculateOptimisticGold(
      mapHexes,
      buildingsUI,
      playerNation,
      buildBuildings,
      serverCancelBuilding,
      buildRoads,
      serverCancelRoadBuilding,
      roads,
      armyTraining
    );
  }, [
    mapHexes,
    buildingsUI,
    playerNation,
    buildBuildings,
    serverCancelBuilding,
    buildRoads,
    serverCancelRoadBuilding,
    roads,
    armyTraining,
  ]);
}
