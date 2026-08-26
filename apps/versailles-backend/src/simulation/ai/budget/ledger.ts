import { NATION_RESOURCE, NationResourceTable } from "@repo/shared/resources";
import { typedEntries } from "@repo/shared/utils";

export function trySpendBudget(
  buildingBudget: Map<NATION_RESOURCE, number>,
  cost: NationResourceTable
) {
  const setResources: { resource: NATION_RESOURCE; total: number }[] = [];
  for (const [resource, amount] of typedEntries(cost)) {
    if (amount === undefined) return { ok: false };

    const resBudget = buildingBudget.get(resource);
    if (resBudget === undefined) return { ok: false };

    const total = resBudget - amount;
    if (total < 0) return { ok: false };

    setResources.push({ resource, total });
  }

  for (const { resource, total } of setResources) {
    buildingBudget.set(resource, total);
  }

  return { ok: true };
}
