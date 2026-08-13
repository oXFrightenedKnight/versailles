// building-owned resources
export const baseResources = ["wheat", "wood"] as const;
export type BASE_RESOURCE = (typeof baseResources)[number];

// nation-owned resources
export const nationResources = ["gold", "manpower"] as const;
export type NATION_RESOURCE = (typeof nationResources)[number];

export type PRODUCIBLE_RESOURCE = NATION_RESOURCE | BASE_RESOURCE;

// The general rule is: buildings CAN produce all types of resources (PRODUCIBLE_RESOURCE),
// but can only consume BASE_RESOURCE

export type NationResourceTable = Partial<Record<NATION_RESOURCE, number>>;
