import { GameCtx } from "#trpc";
import { getBuildingHexMap } from "../buildings/queries";

export function revalidateTraining(ctx: GameCtx) {
  const buildingHexMap = getBuildingHexMap(ctx);

  const deleteTraining = new Set<string>();

  for (const training of ctx.armyTraining) {
    const hex = buildingHexMap.get(training.barrackId);
    if (!hex) continue;

    if (hex.owner !== training.nationId) {
      deleteTraining.add(training.id);
    }
  }

  ctx.armyTraining = ctx.armyTraining.filter((a) => !deleteTraining.has(a.id));
}
