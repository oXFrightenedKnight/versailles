import { armyIntent } from "@/lib/types/game";
import { Hex, Nation } from "@repo/shared";

export function calcAvailableArmy(hex: Hex, playerNation: Nation | null, armyMove: armyIntent[]) {
  const armyInTile = playerNation
    ? (hex?.army.find((obj) => obj.nationId === playerNation.id)?.amount ?? 0)
    : 0;
  const movedArmy = armyMove
    .filter((obj) => obj.hexId === hex.id)
    .reduce((acc, curr) => acc + curr.amount, 0);
  return armyInTile - movedArmy;
}
