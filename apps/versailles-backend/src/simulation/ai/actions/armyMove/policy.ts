import { BorderNeedCategory } from "../../analysis/military/types.js";

export const MINIMUM_WAR_BORDER_ARMY = 5; // minimum army needed at every border with enemy
export const MIN_EXPANSION_RESERVE = 10;

// how much more army the ai will try to stack against opposing enemy army
export const WAR_DEFENSE_MULT = 1.25;

export type AllocateMap = Map<number, { hexId: number; amount: number }[]>;

// controls which proposals get fulfilled and executed first
export const proposalPriority: Record<BorderNeedCategory, number> = {
  active_fight: 6,
  war_defense: 5,
  war_attack: 4,
  target_buildup: 3,
  neutral_defense: 2,
  expansion_move: 1,
  expansion_reserve: 0,
};
