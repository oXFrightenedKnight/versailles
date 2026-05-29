import { Biome, BUILDINGS_CATEGORY, RESOURCES } from "@repo/shared";

export type AIScoreIntentCategory =
  | "buildIntent"
  | "armyTrain"
  | "moveArmy"
  | "buildRoad"
  | "createContract"
  | "declareWarIntent"
  | "answerMail"
  | "signPeaceReqIntent";

export type BaseAIIntent = {
  id: string;
  score: number;
  type: AIScoreIntentCategory;
  reason?: AIScoreReasons[];
};
export type AIScoreReasons = {
  key: string;
  value: number;
  description?: string;
};

export type BuildIntent = BaseAIIntent & {
  type: "buildIntent";
  buildingCategory: BUILDINGS_CATEGORY;
  hexId: number;
};
export type ArmyTrain = BaseAIIntent & {
  type: "armyTrain";
  barrackId: string;
};
export type MoveArmy = BaseAIIntent & {
  type: "moveArmy";
  fromHexId: number;
  toHexId: number;
};
export type BuildRoad = BaseAIIntent & {
  type: "buildRoad";
  fromHexId: number;
  toHexId: number;
};
export type CreateContract = BaseAIIntent & {
  type: "createContract";
  fromBuildingId: string;
  toBuildingId: string;
  resource: RESOURCES;
};
export type DeclareWarIntent = BaseAIIntent & {
  type: "declareWarIntent";
  toNationId: string;
};
export type AnswerMail = BaseAIIntent & {
  type: "answerMail";
  mailId: string;
  answer: boolean;
};
export type SignPeaceReqIntent = BaseAIIntent & {
  type: "signPeaceReqIntent";
  nationId: string;
};

export type AIIntent =
  | BuildIntent
  | ArmyTrain
  | MoveArmy
  | BuildRoad
  | CreateContract
  | DeclareWarIntent
  | AnswerMail
  | SignPeaceReqIntent;

export const BIOME_SCORE_MULT: Record<Biome, number> = {
  plains: 1,
  forest: 0.8,
  mountains: 0.6,
  desert: 0.6,
};

export const BuildingScoreTable = {
  neighbor_category_debuff: -15,
  road_bonus: 10,
  base_biome_score: 10,
  building_on_border: -10,
  building_at_war: -10,
  base_ratio_score: 10,
  skewed_ratio: 10,
  same_existing_category: 5,
  shortage_resource: 10,
};

// represents table of debuff coefficients for each category during wartime
// the lower the coefficient, the less chance ai will have to build it
export const WAR_DEBUFF_CATEGORIES: Partial<Record<BUILDINGS_CATEGORY, number>> = {
  CIVILIAN: 0.6,
  BARRACK: 0.8,
  WATCHTOWER: 0.7,
  FARM: 0.6,
  WOODCAMP: 0.6,
};
// how many of this building category should there be for every civilian?
export const BUILDING_RATIO: Partial<Record<BUILDINGS_CATEGORY, number>> = {
  CIVILIAN: 1,
  FARM: 0.9,
  WOODCAMP: 0.7,
  WATCHTOWER: 0.7,
  BARRACK: 0.3,
};

// ARMY_TRAIN
export const ArmyTrainTable = {
  higher_level: 5,
};
export const BASE_AI_TRAIN_AMOUNT = 100;

// coefficient by which ai predicts could be possible real nation army based on what it sees on the border
export const SAFETY_CF = 1.5;

// ARMY MOVE
export const MoveArmyTable = {
  closer_to_frontline: 10,
};
