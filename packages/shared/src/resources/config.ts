// building-owned resources
export const baseResources = ["wheat", "wood"] as const;

// nation-owned resources
export const nationResources = ["gold", "manpower"] as const;

// The general rule is: buildings CAN produce all types of resources (PRODUCIBLE_RESOURCE),
// but can only consume BASE_RESOURCE
