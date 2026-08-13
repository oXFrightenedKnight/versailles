import { PendingAction } from "@/lib/types/actions";
import { invertResourceTable, NationResourceTable, Road, RoadPoint } from "@repo/shared";
import { RenderRoad } from "./types";
import { StoreType } from "@/lib/stores/intentStore";

export function selectRenderRoads(roads: Road[], pendingActions: PendingAction[]) {
  const byRoadId = new Map<string, RenderRoad>();

  // make sure you only filter out points that are constructing
  const canceledRoadIds = new Set(
    pendingActions.flatMap(({ action }) => (action.type === "road.cancel" ? [action.roadId] : []))
  );

  // start with authoritative server queues
  for (const road of roads) {
    if (canceledRoadIds.has(road.id)) {
      continue;
    }

    byRoadId.set(road.id, {
      key: `road:${road.id}`,

      source: "server",
      roadId: road.id,

      points: road.points.map((p) => ({
        q: p.q,
        r: p.r,
        d1: p.d1,
        d2: p.d2,
        isConstructing: p.isConstructing,
      })), // map for render structure
    });
  }

  // Overlay pending building actions.
  for (const pendingAction of pendingActions) {
    const action = pendingAction.action;

    if (action.type !== "road.build") {
      continue;
    }

    const tempId = crypto.randomUUID();

    byRoadId.set(tempId, {
      key: `construction:${tempId}`,

      source: "pending",
      actionId: action.id,

      points: action.points.map((p) => ({
        q: p.r,
        r: p.r,
        d1: p.d1,
        d2: p.d2,
        isConstructing: true,
      })),
    });
  }

  return [...byRoadId.values()];
}
