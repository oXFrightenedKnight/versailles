import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { NationResourceTable, nationResources } from "@repo/shared/resources";
import { typedEntries } from "@repo/shared/utils";

// returns optimistic nation resources
export function useOptimisticResources() {
  const playerNation = useGameStore((s) => s.playerNation);

  const gameActions = useIntentStore((s) => s.gameActions);

  const totalResourceDelta: NationResourceTable = {};
  for (const action of gameActions) {
    for (const [res, amount] of typedEntries(action.resourceDelta)) {
      if (amount === undefined) continue;
      const curr = totalResourceDelta[res] ?? 0;
      totalResourceDelta[res] = curr + amount;
    }
  }

  const totalOptimisticResources: NationResourceTable = {};

  for (const resource of nationResources) {
    const confirmed = playerNation ? (playerNation.resources[resource] ?? 0) : 0;
    const pendingDelta = totalResourceDelta[resource] ?? 0;

    totalOptimisticResources[resource] = Math.max(confirmed + pendingDelta, 0);
  }

  return totalOptimisticResources;
}
