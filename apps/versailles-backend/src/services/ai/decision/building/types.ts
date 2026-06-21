import { AIScoreReasons } from "#services/ai/types/intent.js";
import { Biome, BUILDINGS_CATEGORY, typeNationResource } from "@repo/shared";

export type ScoredIntent = {
  category: BUILDINGS_CATEGORY;
  hexId: number;
  cost: Partial<Record<typeNationResource, number>>;
  score: number;
  targetLevel: number;
  reason?: AIScoreReasons[];
};
