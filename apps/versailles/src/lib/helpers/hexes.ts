import { Hex } from "@repo/shared";

export function getHexById(id: number, mapHexes: Hex[]) {
  // switch to db request later

  for (const hex of mapHexes) {
    if (hex.id === id) {
      return hex as Hex;
    }
  }
  return null;
}
