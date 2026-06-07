import { Biome, BUILDINGS_CATEGORY, RESOURCES, typeNationResource } from "@repo/shared";

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
  amount: number;
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
