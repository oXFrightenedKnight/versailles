export type BorderNeed = {
  hexId: number;
  currentArmy: number;
  desiredArmy: number; // total army desired for defense
  expansionArmy: number; // total army needed for expansion/attack
  deficit: number;
  priority: number;
};

export type ArmyGroup = {
  hexId: number;
  amount: number;
  availableAmount: number;
};
