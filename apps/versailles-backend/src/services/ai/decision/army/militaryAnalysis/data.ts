import { BorderNeedCategory } from "./types";

export const MINIMUM_WAR_BORDER_ARMY = 5; // minimum army needed at every border with enemy

export const PROTECTION_CATEGORIES = [
  "active_fight",
  "war_attack",
  "war_defense",
  "neutral_defense",
  "expansion_reserve",
  "expansion_move",
] as const;

// basic priority table for blocking most cases
export const priorityTable: Record<BorderNeedCategory, number> = {
  active_fight: 5,
  war_attack: 4,
  war_defense: 3,
  neutral_defense: 2,
  expansion_move: 1,
  expansion_reserve: 0,
};
