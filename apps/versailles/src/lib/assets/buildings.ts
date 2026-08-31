import { BUILDINGS, BUILDINGS_CATEGORY } from "@repo/shared/buildings";

export type BuildingNames = keyof typeof BUILDINGS;

export function getBuildingIconImage(name: BuildingNames) {
  return customBuildingIconImages[name] ?? `/icons/urban/${name}.png`;
}
export const customBuildingIconImages: Record<BuildingNames, string> = {};

export function getBuildingImage(name: BuildingNames) {
  return customBuildingImages[name] ?? `/urban/${name}.png`;
}
export const customBuildingImages: Record<BuildingNames, string> = {};

export function getBuildingCategoryIcon(category: BUILDINGS_CATEGORY) {
  return `/icons/buildings/${category.toLowerCase()}.png`;
}
