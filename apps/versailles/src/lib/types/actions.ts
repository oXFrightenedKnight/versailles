import { GameAction, NATION_RESOURCE, NationResourceTable } from "@repo/shared";

export type PendingAction = {
  action: GameAction;

  resourceDelta: NationResourceTable;
};
