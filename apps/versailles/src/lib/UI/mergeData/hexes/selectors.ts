import { PendingAction } from "@/lib/types/actions";
import { Hex, HexArmy } from "@repo/shared";

export function selectHexes(hexes: Hex[], pendingActions: PendingAction[]): Hex[] {
  const deletedBuildingMap = new Set(
    pendingActions.flatMap((a) =>
      a.action.type === "building.delete" ? [a.action.buildingId] : []
    )
  );

  const availableArmyInHexes = getAvailableArmyInHexes(hexes, pendingActions);

  return hexes.map((h) => {
    const optimisticArmy = availableArmyInHexes.get(h.id);
    const nationArmy = optimisticArmy ?? h.army;

    const isDeletedBuilding = h.buildingId ? deletedBuildingMap.has(h.buildingId) : false;

    const optimisticPopulation = isDeletedBuilding ? 0 : h.population;
    const buildingId = isDeletedBuilding ? null : h.buildingId;

    return {
      ...h,
      army: nationArmy,
      population: optimisticPopulation,
      buildingId,
    };
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
      availableArmies.flatMap((a) => {
        const armyleft = Math.max(0, a.amount - action.amount);

        if (a.nationId !== action.nationId) {
          return a;
        }

        return armyleft > 0 ? { ...a, amount: armyleft } : [];
      })
    );
  }

  return availableByHex;
}
