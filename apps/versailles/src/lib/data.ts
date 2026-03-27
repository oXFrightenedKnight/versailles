import { BUILDINGS_CATEGORY } from "@repo/shared";
import {
  Axe,
  BrickWallShield,
  Hotel,
  LucideIcon,
  RadioTower,
  TrainTrack,
  Wheat,
} from "lucide-react";

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
