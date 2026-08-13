import { PendingAction } from "@/lib/types/actions";
import {
  calculateRoadCost,
  getHexAxialMap,
  Hex,
  invertResourceTable,
  NationResourceTable,
  Road,
  RoadPoint,
} from "@repo/shared";
import { RoadConstructionProjection } from "./types";
import { StoreType } from "@/lib/stores/intentStore";

export function selectRoadConstructions(
  hexes: Hex[],
  roads: Road[],
  pendingActions: PendingAction[]
): RoadConstructionProjection[] {
  const byRoadId = new Map<string, RoadConstructionProjection>();

  const canceledRoadIds = new Set(
    pendingActions.flatMap(({ action }) => (action.type === "road.cancel" ? [action.roadId] : []))
  );

  const axialMap = getHexAxialMap({ mapHexes: hexes });

  // start with authoritative server queues
  for (const road of roads) {
    if (canceledRoadIds.has(road.id)) {
      continue;
    }

    const constructing = road.points.filter((p) => p.isConstructing);
    const finished = road.points.length - constructing.length;
    const refund = calculateRoadCost(constructing.length);

    byRoadId.set(road.id, {
      key: `construction:${road.id}`,

      source: "server",
      roadId: road.id,

      totalPoints: road.points.length,
      constructingPoints: constructing.length,
      progress: (finished / road.points.length) * 100,
      hexIds: road.points.flatMap((p) => axialMap.get(`${p.q},${p.r}`)?.id ?? []),

      optimisticRefund: { gold: refund },
    });
  }

  // Create road construction from pending actions
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

      totalPoints: action.points.length,
      constructingPoints: action.points.length,
      hexIds: action.points.flatMap((p) => axialMap.get(`${p.q},${p.r}`)?.id ?? []),
    });
  }

  return [...byRoadId.values()];
}

export function cancelRoadConstruction(
  projection: RoadConstructionProjection,
  createGameAction: StoreType["createGameAction"],
  deleteGameAction: StoreType["deleteGameAction"]
) {
  if (projection.source === "server") {
    createGameAction({
      action: {
        type: "road.cancel",
        id: crypto.randomUUID(),
        roadId: projection.roadId,
      },

      resourceDelta: projection.optimisticRefund,
    });
  }

  if (projection.source === "pending") {
    deleteGameAction(projection.actionId);
  }
}

export function createBuildRoad(
  { points, cost }: { points: RoadPoint[]; cost: NationResourceTable },
  createGameAction: StoreType["createGameAction"]
) {
  createGameAction({
    action: {
      type: "road.build",
      id: crypto.randomUUID(),
      points,
    },

    resourceDelta: invertResourceTable(cost),
  });
}
