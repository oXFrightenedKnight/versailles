import { getBuildingCategoryIcon, getMiscIcons, getNationFlagURL } from "@/lib/data";
import { BUILDINGS_CATEGORY } from "@repo/shared";

const imageCache: Partial<Record<string, HTMLImageElement>> = {};

export function getCachedImage(src: string): HTMLImageElement | undefined {
  let img = imageCache[src];

  if (!img) {
    img = new Image();

    img.onload = () => {
      console.log("Loaded image:", img!.src);
    };

    img.onerror = () => {
      console.log("Failed to load image:", img!.src);

      img!.onerror = null;

      img!.src = getMiscIcons("unknown");
    };

    img.src = src;

    imageCache[src] = img;
  }

  if (!img.complete || img.naturalWidth === 0) return undefined;

  return imageCache[src];
}

export function getBuildingCategoryImage(category: BUILDINGS_CATEGORY) {
  return getCachedImage(getBuildingCategoryIcon(category));
}

export function getFlagImage(nationId: string) {
  return getCachedImage(getNationFlagURL(nationId));
}

export function getMiscImage(name: string) {
  return getCachedImage(getMiscIcons(name));
}
