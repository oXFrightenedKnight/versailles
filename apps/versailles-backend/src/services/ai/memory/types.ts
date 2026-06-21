import { BUILDINGS_CATEGORY } from "@repo/shared";

export type AIMemory = {
  armyMovement: { currHexId: number; endHexId: number; amount: number }[];
  buildSaving: { hexId: number; category: BUILDINGS_CATEGORY; targetLevel: number }[];
};

export type MemoryCtx = Partial<Record<string, AIMemory>>;
