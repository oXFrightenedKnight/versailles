import { Building, BUILDINGS, Hex } from "@repo/shared";
import { BuildingsByCategoryAndLevel } from "./ai/types/analyze";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; issue: string };

export type ValidBuildIntentData = {
  hex: Hex;
  building: Building | undefined;
  newTotalLevel: number;
  hexOwner: string;
  currentQueuedLevels: number;
};
