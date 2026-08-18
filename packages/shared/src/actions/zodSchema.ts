import { building_categoires } from "#data/buildings";
import { baseResources } from "#data/resources";
import z from "zod";

const actionIdSchema = z.uuid();

const buildBuildingActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("building.build"),

  hexId: z.int(),
  buildingType: z.enum(building_categoires),
  levelsToUpgrade: z.int().min(1),
});
const armyTrainActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("army.train"),

  amount: z.int().min(1),
  barrackId: z.string(),
});
const trainingDeleteActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("army.train.delete"),

  trainingId: z.string(),
});
const createContractActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("contract.create"),

  contractId: z.uuid(),

  startBuildingId: z.string(),
  endBuildingId: z.string(),
  amount: z.int().min(0),
  resource: z.enum(baseResources),
  autoAdjust: z.boolean(),
});
const deleteContractActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("contract.delete"),

  contractId: z.string(),
});
const deleteBuildingActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("building.delete"),

  buildingId: z.string(),
});
const cancelBuildingActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("building.cancel"),

  hexId: z.int(),
});
const buildRoadActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("road.build"),

  points: z.array(
    z.object({
      q: z.int(),
      r: z.int(),
      d1: z.number(),
      d2: z.number(),
    })
  ),
});
const roadCancelActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("road.cancel"),

  roadId: z.string(),
});
const armyMoveActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("army.move"),

  nationId: z.string(),
  hexId: z.int(),
  amount: z.int().min(1),
  direction: z.object({
    dq: z.int(),
    dr: z.int(),
  }),
});
const declareWarActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("diplomacy.war"),

  nationId: z.string(),
});
const signPeaceActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("diplomacy.peace"),

  nationId: z.string(),
});
const readMailsActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("mails.read"),

  mailId: z.string(),
});
const answerMailActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("mails.answer"),

  mailId: z.string(),
  answer: z.boolean(),
});
const updateContractActionSchema = z.object({
  id: actionIdSchema,
  type: z.literal("contract.update"),

  contractId: z.string(),
  changes: z.object({
    amount: z.int().optional(),
    resource: z.enum(baseResources).optional(),
    autoAdjust: z.boolean().optional(),
  }),
});

export const gameActionSchema = z.discriminatedUnion("type", [
  buildBuildingActionSchema,
  buildRoadActionSchema,
  createContractActionSchema,
  updateContractActionSchema,
  answerMailActionSchema,
  readMailsActionSchema,
  signPeaceActionSchema,
  declareWarActionSchema,
  armyMoveActionSchema,
  roadCancelActionSchema,
  cancelBuildingActionSchema,
  deleteBuildingActionSchema,
  deleteContractActionSchema,
  trainingDeleteActionSchema,
  armyTrainActionSchema,
]);
