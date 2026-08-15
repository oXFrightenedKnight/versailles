import { StoreType } from "@/lib/stores/intentStore";
import { PendingAction } from "@/lib/types/actions";
import {
  Building,
  BUILDINGS_CATEGORY,
  calcTotalBuildingCost,
  getBuildingsByIdMap,
  getConstructionProgress,
  Hex,
  invertResourceTable,
  NationResourceTable,
} from "@repo/shared";
import { BuildingConstructionProjection } from "./types";

export function selectBuildingConstructions(
  hexes: Hex[],
  buildings: Building[],
  playerNationId: string | undefined,
  pendingActions: PendingAction[]
): BuildingConstructionProjection[] {
  const byKey = new Map<string, BuildingConstructionProjection>();

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

    const finishedPercentage =
      getConstructionProgress(queue.progress, queue.building, existing) * 100;

    const key = `${hex.id},${queue.owner}`;

    byKey.set(key, {
      key: `construction:${hex.id}`,
      hexId: hex.id,
      buildingType: queue.building,

      ownerId: queue.owner,

      confirmed: {
        levels: queue.levels,
        progress: queue.progress,
        optimisticRefund: { gold: refund },
        finishedPercentage,
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
    if (!playerNationId) break;

    const action = pendingAction.action;

    if (action.type !== "building.build") {
      continue;
    }

    // A cancel action wins over build presentation.
    if (canceledHexIds.has(action.hexId)) {
      continue;
    }

    const key = `${action.hexId},${playerNationId}`;

    const existing = byKey.get(key);

    if (existing) {
      if (existing.buildingType !== action.buildingType) {
        continue;
      }

      existing.pending.levels += action.levelsToUpgrade;
      existing.pending.actionIds.push(action.id);
      existing.totalLevels += action.levelsToUpgrade;

      continue;
    }

    byKey.set(key, {
      key: `construction:${action.hexId}`,
      hexId: action.hexId,
      buildingType: action.buildingType,

      confirmed: null,

      pending: {
        levels: action.levelsToUpgrade,
        actionIds: [action.id],
      },

      totalLevels: action.levelsToUpgrade,

      ownerId: playerNationId,
    });
  }

  return [...byKey.values()];
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
  }: {
    hexId: number;
    category: BUILDINGS_CATEGORY;
    levels: number;
    cost: NationResourceTable;
  },
  pendingActions: PendingAction[],
  createGameAction: StoreType["createGameAction"],
  updateGameAction: StoreType["updateGameAction"]
) {
  const existing = pendingActions.find(
    (a) => a.action.type === "building.build" && a.action.hexId === hexId
  );

  if (existing && existing.action.type === "building.build") {
    updateGameAction(existing.action.id, "building.build", {
      levelsToUpgrade: existing.action.levelsToUpgrade + levels,
    });
  } else if (!existing) {
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
