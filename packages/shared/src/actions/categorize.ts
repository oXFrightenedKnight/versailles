import { ActionBuckets, ActionOfType, ActionType, GameAction } from "./types";

export function categorizeActions(actions: GameAction[]): ActionBuckets {
  const buckets: ActionBuckets = {};

  for (const action of actions) {
    // TypeScript struggles to correlate a dynamic union key with
    // its corresponding array, so isolate the assertion here.
    const actionBucket = buckets[action.type];
    actionBucket ? actionBucket.push(action as never) : (buckets[action.type] = [action as never]);
  }

  return buckets;
}

export function getActions<K extends ActionType>(
  buckets: ActionBuckets,
  type: K
): ActionOfType<K>[] {
  return (buckets[type] ?? []) as ActionOfType<K>[];
}
