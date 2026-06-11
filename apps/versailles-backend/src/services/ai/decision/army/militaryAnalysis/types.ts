export type BorderNeed = {
  hexId: number;
  currentArmy: number;
  desiredArmy: number;
  deficit: number;
  priority: number;
};

export type ArmyGroup = {
  hexId: number;
  amount: number;
  availableAmount: number;
};
