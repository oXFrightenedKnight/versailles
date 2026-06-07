import { TRAIN_COST } from "#data/army";

export function getArmyTrainCost(amount: number) {
  return amount * TRAIN_COST;
}
