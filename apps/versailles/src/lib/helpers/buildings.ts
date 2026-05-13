import { Building, building_categoires } from "@repo/shared/data/buildings";
import { Hex } from "@repo/shared/data/hex_map";

// allows to additionally filter by nationId if provided with nationId and hexes
export function allBuildingsPerCategory(
  buildings: Building[],
  nationId?: string,
  mapHexes?: Hex[]
) {
  // accepts strings type of 'buildingId,nationId'
  const ownerBuildingHexMap = new Map<string, Hex>(
    mapHexes?.map((h) => [`${h.buildingId},${h.owner}`, h])
  );

  return building_categoires.map((c) => {
    const category_buildings = buildings.filter((b) => {
      if (b.category === c) {
        if (nationId && mapHexes) {
          const hex = ownerBuildingHexMap.get(`${b.id},${nationId}`);
          if (hex) return b;
        } else {
          return b;
        }
      }
    });

    return { category: c, count: category_buildings.length };
  });
}
