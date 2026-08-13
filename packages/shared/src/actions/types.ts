import { gameActionSchema } from "@repo/shared";
import z from "zod";

export type ActionMap = {
  [Action in GameAction as Action["type"]]: Omit<Action, "type">;
};

export type ActionType = keyof ActionMap;

export type ActionOfType<K extends ActionType> = ActionMap[K];

export type ActionBuckets = {
  [K in ActionType]?: ActionOfType<K>[];
};

export type GameAction = z.infer<typeof gameActionSchema>;
