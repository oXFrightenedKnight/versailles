import { GameAction } from "@repo/shared/actions";
import { NationResourceTable } from "@repo/shared/resources";

export type PendingAction = {
  action: GameAction;

  resourceDelta: NationResourceTable;
};
