import { PendingAction } from "@/lib/types/actions";
import { ArmyMoveProjection } from "./types";
import { StoreType } from "@/lib/stores/intentStore";

export function selectArmyMoves(pendingActions: PendingAction[]) {
  const byKey = new Map<string, ArmyMoveProjection>();

  for (const pendingAction of pendingActions) {
    const action = pendingAction.action;

    if (action.type !== "army.move") {
      continue;
    }

    const tempId = crypto.randomUUID();

    byKey.set(tempId, {
      key: `training:${tempId}`,

      hexId: action.hexId,

      direction: action.direction,
      amount: action.amount,

      actionId: action.id,
      nationId: action.nationId,
    });
  }

  return [...byKey.values()];
}

export function createArmyMove(
  {
    direction,
    amount,
    nationId,
    hexId,
  }: { direction: { dq: number; dr: number }; amount: number; nationId: string; hexId: number },
  createGameAction: StoreType["createGameAction"]
) {
  createGameAction({
    action: {
      type: "army.move",
      id: crypto.randomUUID(),

      hexId,

      direction,
      amount,
      nationId,
    },

    resourceDelta: {},
  });
}

export function cancelArmyMove(actionId: string, deleteGameAction: StoreType["deleteGameAction"]) {
  deleteGameAction(actionId);
}
