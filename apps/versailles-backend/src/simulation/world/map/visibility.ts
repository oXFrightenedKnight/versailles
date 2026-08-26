import { Hex } from "@repo/shared";

export function filterNationHexes(mapHexes: Hex[], nationId: string) {
  return mapHexes.flatMap((h) =>
    h.build_queue?.owner === nationId ? h : { ...h, build_queue: null }
  );
}
