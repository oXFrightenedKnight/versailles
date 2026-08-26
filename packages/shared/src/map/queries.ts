import { Hex } from "./types";

export function getHexAxialMap({ mapHexes }: { mapHexes: Hex[] }) {
  return new Map(mapHexes.map((h) => [`${h.q},${h.r}`, h]));
}
export function getHexIdMap({ mapHexes }: { mapHexes: Hex[] }) {
  return new Map(mapHexes.map((h) => [h.id, h]));
}

export function getNationArmyInHex(hex: Hex, nationId: string) {
  return hex.army.reduce((acc, army) => (army.nationId === nationId ? acc + army.amount : acc), 0);
}

export function getHexByAxial(q: number, r: number, mapHexes: Hex[]) {
  return mapHexes.find((hex) => hex.q === q && hex.r === r);
}
