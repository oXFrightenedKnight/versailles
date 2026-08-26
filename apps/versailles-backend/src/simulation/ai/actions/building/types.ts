import { BUILDINGS_CATEGORY } from "@repo/shared/buildings";
import { NationResourceTable } from "@repo/shared/resources";
import { AIScoreReasons } from "../../intents/types.js";

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
