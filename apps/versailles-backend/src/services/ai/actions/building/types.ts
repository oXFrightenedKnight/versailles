import { AIScoreReasons } from "#services/ai/intents/types.js";
import { BUILDINGS_CATEGORY, NATION_RESOURCE } from "@repo/shared";

export type ScoredIntent = {
  category: BUILDINGS_CATEGORY;
  hexId: number;
  cost: Partial<Record<NATION_RESOURCE, number>>;
  score: number;
  targetLevel: number;
  reason?: AIScoreReasons[];
};

export type OpeningTarget = {
  category: BUILDINGS_CATEGORY;
  level: number;
};
