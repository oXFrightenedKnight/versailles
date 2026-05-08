import { FALLBACK_POPULATION } from "@/lib/data";
import { numberConverter } from "@/lib/utils";
import { BASE_HEX_POPULATION, Hex } from "@repo/shared";

export function getOptimisticPopulation(selectedHex: Hex | null, serverBuildingsDelete: string[]) {
  if (!selectedHex) return numberConverter(FALLBACK_POPULATION.toString());

  const buildingId = selectedHex.buildingId;
  if (!buildingId) return selectedHex.population;

  const population = !serverBuildingsDelete.includes(buildingId)
    ? numberConverter(selectedHex?.population?.toString() ?? "1000")
    : BASE_HEX_POPULATION;
  return population; // if building exists on this hex, show real population,
  // else show baseHexPopulation
}
