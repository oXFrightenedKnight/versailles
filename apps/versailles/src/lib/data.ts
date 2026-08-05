import { PRODUCIBLE_RESOURCE } from "@repo/shared";
import { BUILDINGS, BUILDINGS_CATEGORY } from "@repo/shared/data/buildings";
import {} from "@repo/shared/data/hex_map";
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
export function getResourceImage(resource: PRODUCIBLE_RESOURCE) {
  return customResourceImages[resource] ?? `/icons/resources/${resource}.png`;
}
export const customResourceImages: Partial<Record<PRODUCIBLE_RESOURCE, string>> = {
  wheat: "/icons/resources/wheat.png",
  wood: "/icons/resources/wood.png",
  gold: "/icons/gold_coin.png",
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

export const PopupText = {
  max_level_reached: {
    body: "This building is already at max level.",
  },
  building_type_mismatch: {
    body: "Building type doesn't match.",
  },
  missing_gold: {
    body: "Not enough gold to build.",
  },
};
