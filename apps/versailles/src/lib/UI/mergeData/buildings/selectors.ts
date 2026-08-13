import { StoreType } from "@/lib/stores/intentStore";
import { PendingAction } from "@/lib/types/actions";
import { Building } from "@repo/shared";

export function selectBuildings(buildings: Building[], pendingActions: PendingAction[]) {
  const deletedBuildingIds = new Set(
    pendingActions.flatMap(({ action }) =>
      action.type === "building.delete" ? [action.buildingId] : []
    )
  );

  return buildings.filter((b) => !deletedBuildingIds.has(b.id));
}

export function deleteBuilding(
  buildingId: string,
  createGameAction: StoreType["createGameAction"]
) {
  createGameAction({
    action: {
      type: "building.delete",
      id: crypto.randomUUID(),
      buildingId: buildingId,
    },

    resourceDelta: {},
  });
}
