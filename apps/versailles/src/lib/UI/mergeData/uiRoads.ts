import { getHexByAxial, Hex, Road } from "@repo/shared";
import { useIntentStore } from "../../stores/intentStore";
import { roadObject } from "../../types/game";

// roads that are used to display for build menu
export type RoadConstructionVM = {
  id: string;
  hexIds: number[];
  fromServer: boolean;
  // amount of total points of this road finished
  finsishedAmount: number;
};

// roads that are used to be rendered on a map
export type RenderRoad = {
  id: string;
  points: {
    q: number;
    r: number;
    d1: number;
    d2: number;
    isConstructing: boolean;
  }[];
  fromServer: boolean;
};

// --- ROADS ---
function getBuildingRoadsServer(
  roads: Road[],
  mapHexes: Hex[],
  serverCancelRoadBuilding: string[]
) {
  return roads
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
    }) as RoadConstructionVM[];
}

function mergeBuildingRoadsClient(buildRoads: roadObject[], mapHexes: Hex[]) {
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
  roads: Road[],
  mapHexes: Hex[],
  serverCancelRoadBuilding: string[],
  buildRoads: roadObject[]
) {
  const serverRoads = getBuildingRoadsServer(roads, mapHexes, serverCancelRoadBuilding);
  const clientRoads = mergeBuildingRoadsClient(buildRoads, mapHexes);
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

// --- RENDERING ROADS ---
function getRoadsServer(roads: Road[], serverCancelRoadBuilding: string[]) {
  return roads.map((r) => {
    const points = [];
    for (const point of r.points) {
      if (serverCancelRoadBuilding.includes(r.id) && point.isConstructing) continue;
      points.push(point);
    }

    return {
      id: r.id,
      points: points,
      fromServer: true,
    };
  }) as RenderRoad[];
}

function getRoadsClient(buildRoads: roadObject[]) {
  return buildRoads.map((r) => {
    const points = r.points.map((p) => ({
      ...p,
      isConstructing: true,
    }));

    return {
      id: r.id,
      points,
      fromServer: false,
    };
  }) as RenderRoad[];
}

export function getRenderRoads(
  roads: Road[],
  serverCancelRoadBuilding: string[],
  buildRoads: roadObject[]
) {
  const serverRoads = getRoadsServer(roads, serverCancelRoadBuilding);
  const clientRoads = getRoadsClient(buildRoads);

  return [...serverRoads, ...clientRoads];
}
