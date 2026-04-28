import BarrackBlock from "@/components/buildingConfig/barrackBlock";
import CivilianBlock from "@/components/buildingConfig/civilianBlock";
import FarmBlock from "@/components/buildingConfig/farmBlock";
import LumberjackBlock from "@/components/buildingConfig/lumberBlock";
import WatchtowerBlock from "@/components/buildingConfig/watchtowerBlock";
import { Building, BUILDINGS, BUILDINGS_CATEGORY, RESOURCES } from "@repo/shared";
import {
  Axe,
  BrickWallShield,
  Hotel,
  LucideIcon,
  RadioTower,
  TrainTrack,
  Wheat,
} from "lucide-react";
import { Contract } from "./types/game";
import { Dispatch } from "react";
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

// Add New building buttons HERE
export type buildingPropData = {
  setIsContractSelected: Dispatch<React.SetStateAction<boolean>>;
  isContractSelected: boolean;
  building: Building;
};
type BuildingComponentEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProps: (data: buildingPropData) => Record<string, any>;
};
export const buildingComponents: Record<string, BuildingComponentEntry> = {
  FARM: {
    component: FarmBlock,
    getProps: (data: buildingPropData) => ({
      setIsContractSelected: data.setIsContractSelected,
      isContractSelected: data.isContractSelected,
      building: data.building,
    }),
  },
  LUMBERJACK_SETTLEMENT: {
    component: LumberjackBlock,
    getProps: (data: buildingPropData) => ({
      setIsContractSelected: data.setIsContractSelected,
      isContractSelected: data.isContractSelected,
      building: data.building,
    }),
  },
  BARRACK: {
    component: BarrackBlock,
    getProps: (data: buildingPropData) => ({
      building: data.building,
    }),
  },
  CIVILIAN: {
    component: CivilianBlock,
    getProps: (data: buildingPropData) => ({
      building: data.building,
    }),
  },
  WATCHTOWER: {
    component: WatchtowerBlock,
    getProps: (data: buildingPropData) => ({
      setIsContractSelected: data.setIsContractSelected,
      isContractSelected: data.isContractSelected,
      building: data.building,
    }),
  },
};
