import { BorderNeedCategory } from "./types";

export const MINIMUM_WAR_BORDER_ARMY = 5; // minimum army needed at every border with enemy
export const MIN_EXPANSION_RESERVE = 10;

export const PROTECTION_CATEGORIES = [
  "target_buildup",
  "active_fight",
  "war_attack",
  "war_defense",
  "neutral_defense",
  "expansion_reserve",
  "expansion_move",
] as const;

// controls what army an intent/proposal has access to
export const reservationAccessLevel: Record<BorderNeedCategory, number> = {
  active_fight: 6,
  war_attack: 5,
  war_defense: 4,
  target_buildup: 3,
  neutral_defense: 2,
  expansion_move: 1,
  expansion_reserve: 0,
};

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
