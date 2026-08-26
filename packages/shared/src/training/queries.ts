import { NationResourceTable } from "../resources/types";
import { TRAIN_COST } from "./config";

export function getArmyTrainCost(amount: number) {
  return amount * TRAIN_COST;
}

export function getTrainingResourceCost(amount: number): NationResourceTable {
  return { gold: getArmyTrainCost(amount), manpower: amount };
}
