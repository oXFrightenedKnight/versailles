import BarrackBlock from "@/components/buildingConfig/barrackBlock";
import CivilianBlock from "@/components/buildingConfig/civilianBlock";
import FarmBlock from "@/components/buildingConfig/farmBlock";
import WatchtowerBlock from "@/components/buildingConfig/watchtowerBlock";
import WoodcampBlock from "@/components/buildingConfig/woodcampBlock";
import { Building, BUILDINGS, BUILDINGS_CATEGORY } from "@repo/shared/data/buildings";
import { RESOURCES } from "@repo/shared/data/hex_map";
import { PeaceOfferMail, PeaceSignedMail, WarEventMail } from "@repo/shared/data/mail";
import {
  Axe,
  BrickWallShield,
  Hotel,
  LucideIcon,
  RadioTower,
  TrainTrack,
  Wheat,
} from "lucide-react";
import { Dispatch } from "react";
import { nationText } from "./helpers/mails";
export type BuildingNames = keyof typeof BUILDINGS;

export const BuildingIcons: Record<"road" | BUILDINGS_CATEGORY, LucideIcon> = {
  FARM: Wheat,
  CIVILIAN: Hotel,
  BARRACK: BrickWallShield,
  WATCHTOWER: RadioTower,
  road: TrainTrack,
  WOODCAMP: Axe,
};
export const BuildingDescriptions: Record<"road" | BUILDINGS_CATEGORY, string> = {
  FARM: "Construct a farm",
  CIVILIAN: "Construct a civilian settlement",
  BARRACK: "Construct a military barrack",
  WATCHTOWER: "Construct a watchtower",
  road: "Construct road path",
  WOODCAMP: "Construct a woodcamp",
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
  WOODCAMP: {
    component: WoodcampBlock,
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

export const FALLBACK_POPULATION = 1000; // displayed when no hex is selected

export type OpenMenus = "none" | "build" | "diplo";

export type MailText = {
  header: string;
  body: string;
};

export const MailTexts = {
  WAR: (mail: WarEventMail, playerId: string) => {
    const attacker = nationText(mail.metadata.attackerNation, playerId);
    const defender = nationText(mail.metadata.defenderNation, playerId);
    return {
      header: "War declaration!",
      body: `${attacker.subject} declared war on ${defender.subject}!`,
    };
  },
  PEACE_OFFER: (mail: PeaceOfferMail, playerId: string) => {
    const from = nationText(mail.metadata.fromNation, playerId);
    const to = nationText(mail.metadata.toNation, playerId);
    return {
      header: "Peace Offer",
      body: `${from.subject} wants to sign peace treaty with ${to.subject}.`,
    };
  },
  PEACE_SIGNED: (mail: PeaceSignedMail, playerId: string) => {
    const from = nationText(mail.metadata.fromNation, playerId);
    const to = nationText(mail.metadata.toNation, playerId);
    return {
      header: "Peace Signed",
      body: `${from.subject} accepted ${to.possesive} peace treaty.`,
    };
  },
};
