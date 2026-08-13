import { ConsumedResource } from "#data/buildings";
import { BASE_RESOURCE, baseResources } from "#data/resources";

// returns all resources a building is allowed to export to another building
export function getAvailableResources(
  existingExports: BASE_RESOURCE[], // resources already exported to this destination
  startProducing: Partial<Record<BASE_RESOURCE, number>>,
  endConsuming: Partial<Record<BASE_RESOURCE, ConsumedResource>>
) {
  const available = new Set<BASE_RESOURCE>();

  const exported = new Set(existingExports);

  for (const resource of baseResources) {
    if (!startProducing[resource] || !endConsuming[resource]?.amount) continue;

    if (exported.has(resource)) continue;

    available.add(resource);
  }

  return available;
}
