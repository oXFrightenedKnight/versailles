import { Point } from "#services/road.js";
import { Biome, BUILDINGS_CATEGORY, RESOURCES, typeNationResource } from "@repo/shared";

export type AIScoreIntentCategory =
  | "buildIntent"
  | "armyTrain"
  | "moveArmy"
  | "buildRoad"
  | "contractIntent"
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
  amount: number;
};
export type MoveArmy = BaseAIIntent & {
  type: "moveArmy";
  fromHexId: number;
  toHexId: number;
  amount: number;
};
export type BuildRoad = BaseAIIntent & {
  type: "buildRoad";
  path: Point[]; // including starting hexId and end hexId
};
export type ContractIntent = BaseAIIntent & {
  type: "contractIntent";
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
  | ContractIntent
  | DeclareWarIntent
  | AnswerMail
  | SignPeaceReqIntent;
