import { PROTECTION_CATEGORIES } from "./data";

export type BorderNeed = {
  hexId: number;
  currentArmy: number;
  desiredArmy: number; // total army desired for defense
  expansionArmy: number; // total army needed for expansion/attack
  deficit: number;
  category: BorderNeedCategory;
};

export type BorderNeedCategory = (typeof PROTECTION_CATEGORIES)[number];

export type ArmyGroup = {
  hexId: number;
  amount: number;
  availableAmount: number;
};
