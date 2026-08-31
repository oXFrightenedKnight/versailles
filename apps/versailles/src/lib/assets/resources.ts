import { PRODUCIBLE_RESOURCE } from "@repo/shared/resources";

export function getResourceImage(resource: PRODUCIBLE_RESOURCE) {
  return `/icons/resources/${resource.toLowerCase()}.png`;
}
