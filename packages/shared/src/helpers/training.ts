import { TRAIN_COST } from "#data/army";
import { NationResourceTable } from "#data/resources";

export function getArmyTrainCost(amount: number) {
  return amount * TRAIN_COST;
}

export function getTrainingResourceCost(amount: number): NationResourceTable {
  return { gold: getArmyTrainCost(amount), manpower: amount };
}
