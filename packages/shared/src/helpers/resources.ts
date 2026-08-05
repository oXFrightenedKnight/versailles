import { Nation } from "#data/nations";
import {
  BASE_RESOURCE,
  baseResources,
  NATION_RESOURCE,
  nationResources,
  PRODUCIBLE_RESOURCE,
} from "#data/resources";

export function isNationResource(resource: PRODUCIBLE_RESOURCE): resource is NATION_RESOURCE {
  return nationResourceSet.has(resource);
}
const nationResourceSet = new Set<string>(nationResources);

export function isBaseResource(resource: PRODUCIBLE_RESOURCE): resource is BASE_RESOURCE {
  return !isNationResource(resource);
}
const baseResourceSet = new Set<string>(baseResources);

export function isResource(resource: string): resource is PRODUCIBLE_RESOURCE {
  return nationResourceSet.has(resource) || baseResourceSet.has(resource);
}

export function getNationResource(nation: Nation, resource: NATION_RESOURCE) {
  return nation.resources[resource] ?? 0;
}
