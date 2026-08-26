import { SupplyContract } from "../contracts/types";
import { BASE_RESOURCE } from "../resources/types";
import { getBuildingConfig } from "./queries";
import { Building } from "./types";

export function calculateNeededResource(
  toBuilding: Building,
  resource: BASE_RESOURCE,
  contracts: SupplyContract[]
) {
  const importing = contracts
    .filter((c) => c.toBuildingId === toBuilding.id && c.resource === resource)
    .reduce((acc, c) => acc + c.amount, 0);

  const config = getBuildingConfig(toBuilding);
  const required = config?.consuming?.[resource]?.amount ?? 0;

  const needed = Math.max(0, required - importing);
  return needed;
}
