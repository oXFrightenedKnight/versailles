import { Hex, NATION_NAMES } from "@repo/shared";

export function getNationName({ id }: { id: string }) {
  const entry = Object.entries(NATION_NAMES).find(([_, value]) => value === id);

  const key = entry?.[0] ? entry?.[0] : "tribes";
  return key;
}

export function totalNationArmy({ mapHexes, nationId }: { mapHexes: Hex[]; nationId: string }) {
  return mapHexes.reduce((acc, h) => {
    const army = h.army.find((a) => a.nationId === nationId);
    if (army) return acc + army.amount;
    return acc;
  }, 0);
}
