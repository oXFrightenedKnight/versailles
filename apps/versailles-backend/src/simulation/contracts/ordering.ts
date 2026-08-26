import { GameCtx } from "#trpc";
import { SupplyContract } from "@repo/shared";

export function sortContracts(contracts: SupplyContract[]) {
  return contracts.sort((a, b) => a.executionOrder - b.executionOrder || a.id.localeCompare(b.id));
}

export function updateContractOrderIdx(ctx: GameCtx) {
  ctx.counters.nextContractExecutionOrder++;
}
