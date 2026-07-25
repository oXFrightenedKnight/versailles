import { BorderNeed, BorderNeedCategory } from "#services/ai/analysis/military/types.js";
import { AIPlanningState } from "../types";
import { reservationAccessLevel } from "./policy";

// reserve desired army for border hexes
export function reserveBorderArmy(borderAnalysis: BorderNeed[], planning: AIPlanningState) {
  for (const border of borderAnalysis) {
    const reserved = planning.softReservedArmyByHex.get(border.hexId);

    const object = {
      amount: border.desiredArmy,
      category: border.category,
      reason: "reserved analyzed border",
    };
    if (!reserved) {
      planning.softReservedArmyByHex.set(border.hexId, [object]);
    } else {
      reserved.push(object);
    }
  }
}

export function softReserveArmy(
  planning: AIPlanningState,
  hexId: number,
  amount: number,
  category: BorderNeedCategory,
  reason: string
) {
  const reserved = planning.softReservedArmyByHex.get(hexId);
  if (!reserved) {
    planning.softReservedArmyByHex.set(hexId, [{ amount, category, reason }]);
  } else {
    reserved.push({ amount, category, reason });
  }
}

// gets available army of hex for specific request category
export function getAvailableArmyForCategory(
  planning: AIPlanningState,
  hexId: number,
  requesterCategory: BorderNeedCategory
) {
  const army = planning.availableArmyByHex.get(hexId) ?? 0;
  const reservations = planning.softReservedArmyByHex.get(hexId) ?? [];

  const blocked = reservations
    .filter((r) => blocksRequest(r.category, requesterCategory))
    .reduce((sum, r) => sum + r.amount, 0);

  return Math.max(0, army - blocked);
}

function blocksRequest(
  reservedCategory: BorderNeedCategory,
  requesterCategory: BorderNeedCategory
) {
  // Same or higher priority reservations always block.
  if (reservationAccessLevel[reservedCategory] >= reservationAccessLevel[requesterCategory])
    return true;

  // Active war-border protection should not be stolen even by priority 4.
  if (reservedCategory === "war_defense" && requesterCategory === "active_fight") return true;

  // Priority 1/2 reserves can be stolen by higher priorities.
  return false;
}
