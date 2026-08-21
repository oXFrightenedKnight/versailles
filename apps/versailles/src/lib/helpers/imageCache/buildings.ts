import { getBuildingCategoryIcon } from "@/lib/data";
import { BUILDINGS_CATEGORY } from "@repo/shared";

const buildingIconCache: Partial<Record<BUILDINGS_CATEGORY, HTMLImageElement>> = {};

export function getBuildingCategoryImage(
  category: BUILDINGS_CATEGORY
): HTMLImageElement | undefined {
  let img = buildingIconCache[category];

  if (!img) {
    img = new Image();

    img.onload = () => {
      console.log("Loaded building icon", img!.src);
    };

    img.onerror = () => {
      console.log("Failed to load building icon", img!.src);
    };

    img.src = getBuildingCategoryIcon(category);

    buildingIconCache[category] = img;
  }

  if (!img.complete || img.naturalWidth === 0) return undefined;

  return buildingIconCache[category];
}
