import { Building, Hex } from "@repo/shared";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; issue: string };

export type ValidBuildIntentData = {
  hex: Hex;
  building: Building | undefined;
  newTotalLevel: number;
  hexOwner: string;
  currentQueuedLevels: number;
};
