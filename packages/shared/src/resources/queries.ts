import { Nation } from "../nations/types";
import { typedEntries } from "../utils/object";
import { nationResources, baseResources } from "./config";
import { BASE_RESOURCE, NATION_RESOURCE, NationResourceTable, PRODUCIBLE_RESOURCE } from "./types";

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

export function invertResourceTable(table: NationResourceTable) {
  const newTable: NationResourceTable = {};

  for (const [res, amount] of typedEntries(table)) {
    if (amount === undefined) continue;

    newTable[res] = -amount;
  }

  return newTable;
}
