import { BorderNeedCategory } from "#services/ai/analysis/military/types.js";

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
