import { ActionWeight, BudgetAction, BudgetAllocationRequest } from "../types";

export function allocateResource(
  total: number,
  weights: ActionWeight[],
  requests: BudgetAllocationRequest[]
): Map<BudgetAction, number> {
  const allocations = new Map<BudgetAction, number>();
  let remaining = Math.max(0, total);

  const exactActions = new Set<BudgetAction>();

  const sortedRequests = [...requests].sort((a, b) => b.priority - a.priority);

  // Stage 1: calculated allocations
  for (const request of sortedRequests) {
    if (remaining <= 0) break;

    const requested = Math.max(0, request.amount);
    const allocated = Math.min(requested, remaining);

    allocations.set(request.action, (allocations.get(request.action) ?? 0) + allocated);

    remaining -= allocated;

    if (request.mode === "exact") {
      exactActions.add(request.action);
    }
  }

  // Stage 2: weighted remainder
  const eligibleWeights = weights.filter(
    ({ action, weight }) => weight > 0 && !exactActions.has(action)
  );

  const totalWeight = eligibleWeights.reduce((sum, entry) => sum + entry.weight, 0);

  if (remaining > 0 && totalWeight > 0) {
    for (const { action, weight } of eligibleWeights) {
      const proportionalAmount = remaining * (weight / totalWeight);

      allocations.set(action, (allocations.get(action) ?? 0) + proportionalAmount);
    }
  }

  // Ensure every action can be queried safely
  for (const { action } of weights) {
    if (!allocations.has(action)) {
      allocations.set(action, 0);
    }
  }

  return allocations;
}
