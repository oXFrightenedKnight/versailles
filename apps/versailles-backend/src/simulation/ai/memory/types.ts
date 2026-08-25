import { BUILDINGS_CATEGORY } from "@repo/shared";
import { BuildSavingGoalType } from "../planning/types";

export type AIMemory = {
  armyMovement: ArmyMoveMemo[];
  buildSaving: BuildSaveMemo[];
  attackTargets: string[];
};

export type ArmyMoveMemo = { currHexId: number; endHexId: number; amount: number };

export type BuildSaveMemo = {
  hexId: number;
  category: BUILDINGS_CATEGORY;
  targetLevel: number;
  type: BuildSavingGoalType;
};

export type MemoryCtx = Partial<Record<string, AIMemory>>;
