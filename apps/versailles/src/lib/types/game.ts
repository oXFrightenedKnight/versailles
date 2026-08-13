import { BUILDINGS_CATEGORY } from "@repo/shared/data/buildings";
import { ActionOfType } from "@repo/shared";

export type BuildModeType = "road" | "none" | BUILDINGS_CATEGORY;

export type RoadDraft = {
  id: string;
  points: { q: number; r: number; d1: number; d2: number }[];
};

export interface MergedContract extends ActionOfType<"contract.create"> {
  fromServer: boolean;
}
