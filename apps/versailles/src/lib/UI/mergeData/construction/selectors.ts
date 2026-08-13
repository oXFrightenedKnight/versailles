import { PendingAction } from "@/lib/types/actions";
import {
  ActionOfType,
  Building,
  BUILDINGS_CATEGORY,
  calcTotalBuildingCost,
  getBuildingsByIdMap,
  Hex,
  invertResourceTable,
  NationResourceTable,
} from "@repo/shared";
import { BuildingConstructionProjection } from "./types";
import { StoreType } from "@/lib/stores/intentStore";

export function selectBuildingConstructions(
  hexes: Hex[],
  buildings: Building[],
  pendingActions: PendingAction[]
): BuildingConstructionProjection[] {
  const byHexId = new Map<number, BuildingConstructionProjection>();

  const buildingIdMap = getBuildingsByIdMap(buildings);

  const canceledHexIds = new Set(
    pendingActions.flatMap(({ action }) =>
      action.type === "building.cancel" ? [action.hexId] : []
    )
  );

  // start with authoritative server queues
  for (const hex of hexes) {
    const queue = hex.build_queue;

    if (!queue || canceledHexIds.has(hex.id)) {
      continue;
    }

    const existing = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;
    const existingCost = existing ? calcTotalBuildingCost(existing.category, existing.level) : 0;
    const confirmedCost = calcTotalBuildingCost(
      queue.building,
      (existing?.level ?? 0) + (queue.levels ?? 0)
    );
    const refund = Math.max(0, confirmedCost - existingCost);

    byHexId.set(hex.id, {
      key: `construction:${hex.id}`,
      hexId: hex.id,
      buildingType: queue.building,

      confirmed: {
        levels: queue.levels,
        progress: queue.progress,
        optimisticRefund: { gold: refund },
      },

      pending: {
        levels: 0,
        actionIds: [],
      },

      totalLevels: queue.levels,
    });
  }

  // Overlay pending building actions.
  for (const pendingAction of pendingActions) {
    const action = pendingAction.action;

    if (action.type !== "building.build") {
      continue;
    }

    // A cancel action wins over build presentation.
    if (canceledHexIds.has(action.hexId)) {
      continue;
    }

    const existing = byHexId.get(action.hexId);

    if (existing) {
      if (existing.buildingType !== action.buildingType) {
        continue;
      }

      existing.pending.levels += action.levelsToUpgrade;
      existing.pending.actionIds.push(action.id);
      existing.totalLevels += action.levelsToUpgrade;

      continue;
    }

    byHexId.set(action.hexId, {
      key: `construction:${action.hexId}`,
      hexId: action.hexId,
      buildingType: action.buildingType,

      confirmed: null,

      pending: {
        levels: action.levelsToUpgrade,
        actionIds: [action.id],
      },

      totalLevels: action.levelsToUpgrade,
    });
  }

  return [...byHexId.values()];
}

export function cancelBuildingConstruction(
  projection: BuildingConstructionProjection,
  createGameAction: StoreType["createGameAction"],
  deleteGameAction: StoreType["deleteGameAction"]
) {
  // create server cancel request if confirmed
  if (projection.confirmed) {
    createGameAction({
      action: {
        type: "building.cancel",
        id: crypto.randomUUID(),
        hexId: projection.hexId,
      },

      resourceDelta: projection.confirmed.optimisticRefund,
    });
  }

  // delete client consutrction actions
  for (const actionId of projection.pending.actionIds) {
    deleteGameAction(actionId);
  }
}

export function createBuildingConstruction(
  {
    hexId,
    category,
    levels,
    cost,
  }: { hexId: number; category: BUILDINGS_CATEGORY; levels: number; cost: NationResourceTable },
  pendingActions: PendingAction[],
  createGameAction: StoreType["createGameAction"],
  updateGameAction: StoreType["updateGameAction"]
) {
  const existing = pendingActions.find(
    (a) => a.action.type === "building.build" && a.action.hexId === hexId
  );
  if (existing?.action.type !== "building.build") return;

  if (existing) {
    updateGameAction(existing.action.id, "building.build", {
      levelsToUpgrade: existing.action.levelsToUpgrade + levels,
    });
  } else {
    createGameAction({
      action: {
        type: "building.build",
        hexId,
        id: crypto.randomUUID(),
        buildingType: category,
        levelsToUpgrade: levels,
      },
      resourceDelta: invertResourceTable(cost),
    });
  }
}
