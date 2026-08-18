import { BASE_MANPOWER_WEIGHTS } from "../policy";
import { ActionWeight, BudgetAllocationRequest } from "../types";
import { allocateResource } from "./shared";

// return map of gold distrubution over budget actions
export function calcManpowerBudget(manpower: number, requests: BudgetAllocationRequest[] = []) {
  const weights = calcManpowerWeights();

  const manpowerMap = allocateResource(manpower, weights, requests);

  return { total: manpower, manpowerMap };
}

// this function is only suitable for calculating gold
function calcManpowerWeights(): ActionWeight[] {
  const weights = BASE_MANPOWER_WEIGHTS;

  let train = weights["train"];

  return [{ action: "train", weight: train }];
}
