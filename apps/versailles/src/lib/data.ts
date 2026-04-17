import { BUILDINGS, BUILDINGS_CATEGORY, RESOURCES } from "@repo/shared";
import {
  Axe,
  BrickWallShield,
  Hotel,
  LucideIcon,
  RadioTower,
  TrainTrack,
  Wheat,
} from "lucide-react";
export type BuildingNames = keyof typeof BUILDINGS;

export const BuildingIcons: Record<"road" | BUILDINGS_CATEGORY, LucideIcon> = {
  FARM: Wheat,
  CIVILIAN: Hotel,
  BARRACK: BrickWallShield,
  WATCHTOWER: RadioTower,
  road: TrainTrack,
  LUMBERJACK_SETTLEMENT: Axe,
};
export const BuildingDescriptions: Record<"road" | BUILDINGS_CATEGORY, string> = {
  FARM: "Construct a farm",
  CIVILIAN: "Construct a civilian settlement",
  BARRACK: "Construct a military barrack",
  WATCHTOWER: "Construct a watchtower",
  road: "Construct road path",
  LUMBERJACK_SETTLEMENT: "Construct lumberjack settlement",
};
export function getResourceImage(resource: RESOURCES) {
  return customResourceImages[resource] ?? `/icons/resources/${resource}.png`;
}
export const customResourceImages: Record<RESOURCES, string> = {
  wheat: "/icons/resources/wheat.png",
  wood: "/icons/resources/wood.png",
};
export function getBuildingIconImage(name: BuildingNames) {
  return customBuildingIconImages[name] ?? `/icons/urban/${name}.png`;
}
export const customBuildingIconImages: Record<BuildingNames, string> = {};

export function getBuildingImage(name: BuildingNames) {
  return customBuildingImages[name] ?? `/urban/${name}.png`;
}
export const customBuildingImages: Record<BuildingNames, string> = {};

export const Descriptions: Record<string, string> = {
  manpower: "All people in your nation that can serve in military.",
  gold: "Your nation's exchange currency.",
};
