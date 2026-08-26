import { Road } from "@repo/shared/roads";

export function filterNationRoads(roads: Road[], nationId: string) {
  return roads.flatMap((r) =>
    r.constructing?.owner === nationId
      ? r
      : { ...r, points: r.points.filter((p) => !p.isConstructing) }
  );
}
