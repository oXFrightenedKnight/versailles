import { PROTECTION_CATEGORIES } from "./policy";

export type BorderNeed = {
  hexId: number;
  currentArmy: number;
  desiredArmy: number; // total army desired for defense
  expansionArmy: number; // total army needed for expansion/attack
  deficit: number;
  category: BorderNeedCategory;
};

export type BorderNeedCategory = (typeof PROTECTION_CATEGORIES)[number];
