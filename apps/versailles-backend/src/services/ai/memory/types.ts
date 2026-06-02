export type AIMemory = {
  armyMovement: { currHexId: number; endHexId: number; amount: number }[];
};

export type MemoryCtx = Partial<Record<string, AIMemory>>;
