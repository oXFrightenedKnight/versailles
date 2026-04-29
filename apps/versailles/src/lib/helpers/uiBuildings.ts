import { BUILDINGS_CATEGORY, Hex } from "@repo/shared";
import { newBuilding } from "../types/game";
import { useIntentStore } from "../intentStore";
import { useGameStore } from "../gameStore";

export type BuildingConstructionVM = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
  progress: number;
  fromServer: boolean;
};

export function getConstructingBuildingsServer(mapHexes: Hex[]) {
  const serverCancelBuilding = useIntentStore.getState().serverCancelBuilding;
  return (
    mapHexes
      // leave only hexes with build queue, and are not included in cancel intent
      .filter((h) => h.build_queue && !serverCancelBuilding.includes(h.id))
      .map((h) => ({
        hexId: h.id,
        buildingType: h.build_queue!.building,
        levelsToUpgrade: h.build_queue!.levels,
        progress: h.build_queue!.progress,
        fromServer: true,
      })) as BuildingConstructionVM[]
  );
}

export function mergeConstructingBuildingsClient(buildings: newBuilding[]) {
  return buildings.map((b) => ({
    hexId: b.hexId,
    buildingType: b.buildingType,
    levelsToUpgrade: b.levelsToUpgrade,
    progress: 0,
    fromServer: false,
  })) as BuildingConstructionVM[];
}

export function mergeConstructingBuildings(
  serverBuildings: BuildingConstructionVM[],
  clientBuildings: BuildingConstructionVM[]
) {
  const { server, client } = mergeSameClientToServer(serverBuildings, clientBuildings);
  return [...server, ...client];
}

export function cancelServerBuildingIntent(hexId: number) {
  const setServerCancelBuilding = useIntentStore.getState().setServerCancelBuilding;

  setServerCancelBuilding((prev) => {
    const existing = prev.find((id) => id === hexId);

    if (!existing) return [...prev, hexId];
    return prev;
  });

  // remove from client in-case if the queue is merged
  cancelClientBuildingIntent(hexId);
}

export function cancelClientBuildingIntent(hexId: number) {
  const setBuildBuildings = useIntentStore.getState().setBuildBuildings;

  setBuildBuildings((prev) => {
    const existing = prev.find((obj) => obj.hexId === hexId);

    if (existing) {
      const filtered = prev.filter((obj) => obj.hexId !== hexId);
      return [...filtered];
    }
    return prev;
  });
}

// merge client requeusts that build on the same hex with their server equivalents
function mergeSameClientToServer(
  serverBuildings: BuildingConstructionVM[],
  clientBuildings: BuildingConstructionVM[]
) {
  const serverIdSet = new Set<number>(serverBuildings.map((b) => b.hexId));
  const mergeHexIdMap = new Map<number, BuildingConstructionVM>();

  for (const building of clientBuildings) {
    if (serverIdSet.has(building.hexId)) {
      mergeHexIdMap.set(building.hexId, building);
    }
  }

  const mergedClientBuildings = clientBuildings.filter((b) => !mergeHexIdMap.has(b.hexId));
  const mergedServerBuildings: BuildingConstructionVM[] = [];
  for (const building of serverBuildings) {
    if (mergeHexIdMap.has(building.hexId)) {
      const clientBuilding = mergeHexIdMap.get(building.hexId);
      if (!clientBuilding) continue;
      const merged = {
        ...clientBuilding,
        ...building,
        levelsToUpgrade: building.levelsToUpgrade + clientBuilding?.levelsToUpgrade,
      } as BuildingConstructionVM;
      mergedServerBuildings.push(merged);
    } else {
      mergedServerBuildings.push(building);
    }
  }

  return { server: mergedServerBuildings, client: mergedClientBuildings };
}
