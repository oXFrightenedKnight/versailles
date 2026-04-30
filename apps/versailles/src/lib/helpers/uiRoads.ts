import { getHexByAxial, Hex, Road } from "@repo/shared";
import { useIntentStore } from "../intentStore";
import { roadObject } from "../types/game";

export type RoadConstructionVM = {
  id: string;
  hexIds: number[];
  fromServer: boolean;
  // amount of total points of this road finished
  finsishedAmount: number;
};

// --- ROADS ---
export function getBuildingRoadsServer(roads: Road[], mapHexes: Hex[]) {
  const serverCancelRoadBuilding = useIntentStore.getState().serverCancelRoadBuilding;

  return (
    roads
      // leave only hexes with build queue, and are not included in cancel intent
      .filter((r) => r.constructing && !serverCancelRoadBuilding.includes(r.id))
      .map((r) => {
        const hexIds = [];
        for (const point of r.points) {
          const hex = getHexByAxial(point.q, point.r, mapHexes);
          if (hex) hexIds.push(hex.id);
        }

        const finishedPoints = r.points.filter((p) => !p.isConstructing);

        return {
          id: r.id,
          hexIds: hexIds,
          fromServer: true,
          finsishedAmount: finishedPoints.length,
        };
      }) as RoadConstructionVM[]
  );
}

export function mergeBuildingRoadsClient(buildRoads: roadObject[], mapHexes: Hex[]) {
  return buildRoads.map((r) => {
    const hexIds = [];
    for (const point of r.points) {
      const hex = getHexByAxial(point.q, point.r, mapHexes);
      if (hex) hexIds.push(hex.id);
    }

    return {
      id: r.id,
      hexIds,
      finsishedAmount: 0,
      fromServer: false,
    };
  }) as RoadConstructionVM[];
}

export function mergeBuildingRoads(
  serverRoads: RoadConstructionVM[],
  clientRoads: RoadConstructionVM[]
) {
  return [...serverRoads, ...clientRoads];
}

export function cancelRoadBuildingServer(roadId: string) {
  const setServerCancelRoadBuilding = useIntentStore.getState().setServerCancelRoadBuilding;

  setServerCancelRoadBuilding((prev) => {
    const existing = prev.find((id) => id === roadId);

    if (!existing) return [...prev, roadId];
    return prev;
  });
}

export function cancelRoadBuildingClient(roadId: string) {
  const setBuildRoads = useIntentStore.getState().setBuildRoads;

  setBuildRoads((prev) => {
    const existing = prev.find((obj) => obj.id === roadId);

    if (existing) {
      const filtered = prev.filter((obj) => obj.id !== roadId);
      return [...filtered];
    }
    return prev;
  });
}
