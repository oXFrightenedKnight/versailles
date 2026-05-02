import { useIntentStore } from "../intentStore";

export function cancelArmyMove(hexId: number, direction: { dq: number; dr: number }) {
  const setArmyMove = useIntentStore.getState().setArmyMove;

  setArmyMove((prev) => {
    return prev.filter(
      (a) =>
        !(a.hexId === hexId && a.direction.dq === direction.dq && a.direction.dr === direction.dr)
    );
  });
}
