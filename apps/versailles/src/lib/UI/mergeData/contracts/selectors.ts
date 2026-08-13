import { StoreType } from "@/lib/stores/intentStore";
import { PendingAction } from "@/lib/types/actions";
import { ActionOfType, BASE_RESOURCE, SupplyContract } from "@repo/shared";
import { ContractProjection } from "./types";

export function selectContracts(
  contracts: SupplyContract[],
  pendingActions: PendingAction[]
): ContractProjection[] {
  const byContractId = new Map<string, ContractProjection>();

  const deletedContractIds = new Set(
    pendingActions.flatMap(({ action }) =>
      action.type === "contract.delete" ? [action.contractId] : []
    )
  );

  let highestOrder = contracts.reduce(
    (acc, c) => (c.executionOrder > acc ? c.executionOrder : acc),
    0
  );

  // start with authoritative server queues
  for (const contract of contracts) {
    if (deletedContractIds.has(contract.id)) {
      continue;
    }

    byContractId.set(contract.id, {
      key: `contract:${contract.id}`,
      source: "server",
      executionOrder: contract.executionOrder,

      contractId: contract.id,

      fromBuildingId: contract.fromBuildingId,
      toBuildingId: contract.toBuildingId,

      amount: contract.amount,
      resource: contract.resource,
      autoAdjust: contract.autoAdjust,
    });
  }

  // Create client projections from actions
  for (const pendingAction of pendingActions) {
    const action = pendingAction.action;

    if (action.type !== "contract.create") {
      continue;
    }

    byContractId.set(action.contractId, {
      key: `contract:${action.contractId}`,
      source: "pending",
      executionOrder: highestOrder + 1,

      actionId: action.id,
      contractId: action.contractId,

      fromBuildingId: action.startBuildingId,
      toBuildingId: action.endBuildingId,

      amount: action.amount,
      resource: action.resource,
      autoAdjust: action.autoAdjust,
    });
    highestOrder++;
  }

  return [...byContractId.values()];
}

export function cancelContract(
  projection: ContractProjection,
  createGameAction: StoreType["createGameAction"],
  deleteGameAction: StoreType["deleteGameAction"]
) {
  if (projection.source === "server") {
    createGameAction({
      action: {
        id: crypto.randomUUID(),
        type: "contract.delete",
        contractId: projection.contractId,
      },
      resourceDelta: {},
    });
  }

  if (projection.source === "pending") {
    deleteGameAction(projection.actionId);
  }
}

export function updateContract(
  projection: ContractProjection,
  changes: ActionOfType<"contract.update">["changes"],
  createAction: StoreType["createGameAction"],
  updateAction: StoreType["updateGameAction"]
) {
  if (projection.source === "server") {
    createAction({
      action: {
        id: crypto.randomUUID(),
        type: "contract.update",
        contractId: projection.contractId,
        changes,
      },
      resourceDelta: {},
    });
  }

  if (projection.source === "pending") {
    updateAction(projection.actionId, "contract.create", { ...changes });
  }
}

export function createContract(
  fields: {
    startBuildingId: string;
    endBuildingId: string;
    amount: number;
    resource: BASE_RESOURCE;
    autoAdjust: boolean;
  },
  createAction: StoreType["createGameAction"]
) {
  const actionId = crypto.randomUUID();
  const contractId = crypto.randomUUID();

  createAction({
    action: {
      id: actionId,
      type: "contract.create",
      contractId: contractId,
      ...fields,
    },
    resourceDelta: {},
  });
}
