import { baseResources, nationResources } from "./config";

export type BASE_RESOURCE = (typeof baseResources)[number];

export type NATION_RESOURCE = (typeof nationResources)[number];

export type PRODUCIBLE_RESOURCE = NATION_RESOURCE | BASE_RESOURCE;

export type NationResourceTable = Partial<Record<NATION_RESOURCE, number>>;
