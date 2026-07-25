import { BorderNeedCategory } from "#services/ai/analysis/military/types.js";

export type ArmyGroup = {
  hexId: number;
  amount: number;
  availableAmount: number;
};

export type ProposalArmyMove = {
  path: number[];
  amount: number;
  category: BorderNeedCategory;
};
