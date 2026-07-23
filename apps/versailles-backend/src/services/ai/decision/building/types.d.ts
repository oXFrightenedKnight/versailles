import { AIScoreReasons } from "#services/ai/types/intent.js";
import { Biome, BUILDINGS_CATEGORY, NATION_RESOURCE } from "@repo/shared";

export type ScoredIntent = {
  category: BUILDINGS_CATEGORY;
  hexId: number;
  cost: Partial<Record<NATION_RESOURCE, number>>;
  score: number;
  targetLevel: number;
  reason?: AIScoreReasons[];
};
