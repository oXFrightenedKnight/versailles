import { AIScoreReasons } from "../../intents/types.js";
import { BUILDINGS_CATEGORY, NATION_RESOURCE, NationResourceTable } from "@repo/shared";

export type ScoredIntent = {
  category: BUILDINGS_CATEGORY;
  hexId: number;
  cost: NationResourceTable;
  score: number;
  targetLevel: number;
  reason?: AIScoreReasons[];
};

export type OpeningTarget = {
  category: BUILDINGS_CATEGORY;
  level: number;
};
