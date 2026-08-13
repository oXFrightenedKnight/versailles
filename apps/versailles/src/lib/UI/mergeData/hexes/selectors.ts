import { PendingAction } from "@/lib/types/actions";
import { Hex, HexArmy } from "@repo/shared";

export function selectHexes(hexes: Hex[], pendingActions: PendingAction[]) {
  const deletedBuildingMap = new Set(
    pendingActions.flatMap((a) =>
      a.action.type === "building.delete" ? [a.action.buildingId] : []
    )
  );

  const availableArmyInHexes = getAvailableArmyInHexes(hexes, pendingActions);

  return hexes.map((h) => {
    const optimisticArmy = availableArmyInHexes.get(h.id);
    if (optimisticArmy) {
      h.army = optimisticArmy;
    }
    if (h.buildingId && deletedBuildingMap.has(h.buildingId)) {
      h.population = 0;
      h.buildingId = null;
    }

    return h;
  });
}

export function getAvailableArmyInHexes(hexes: Hex[], pendingActions: PendingAction[]) {
  const availableByHex = new Map<number, HexArmy[]>(hexes.map((h) => [h.id, h.army]));

  for (const pending of pendingActions) {
    const action = pending.action;
    if (action.type !== "army.move") continue;

    const availableArmies = availableByHex.get(action.hexId);
    if (!availableArmies) continue;

    availableByHex.set(
      action.hexId,
      availableArmies.flatMap((a) =>
        a.nationId === action.nationId ? { ...a, amount: a.amount - action.amount } : a
      )
    );
  }

  return availableByHex;
}
