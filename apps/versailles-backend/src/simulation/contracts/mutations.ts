import { GameCtx } from "#trpc";
import { SupplyContract } from "@repo/shared";

export function createContract(contracts: SupplyContract[], newContract: SupplyContract) {
  contracts.push(newContract);
  return { ok: true };
}

export function updateContract(ctx: GameCtx, contractId: string, changes: Partial<SupplyContract>) {
  ctx.contracts = ctx.contracts.map((contract) =>
    contract.id === contractId ? { ...contract, ...changes } : contract
  );

  return { ok: true };
}

export function deleteContract({ contracts }: { contracts: SupplyContract[] }, contractId: string) {
  contracts = contracts.filter((c) => c.id !== contractId);

  return { ok: true };
}
