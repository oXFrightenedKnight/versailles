import { MAP_RADIUS } from "@repo/shared";
import { generateHexMap } from "../services/map.js";
import { generateNations } from "../services/genNations.js";
import { GameCtx } from "../trpc/index.js";

export const memoryStore = {
  maps: new Map<string, any>(),
};

export function populateGameCtx() {
  const ctx: GameCtx = {
    mapHexes: [],
    nations: [],
    turn: 0,
    roads: [],
    buildings: [],
    modifiers: [],
    mails: [],
  };

  if (memoryStore.maps.has("mapHexes")) {
    ctx.mapHexes = memoryStore.maps.get("mapHexes");
  } else {
    ctx.mapHexes = generateHexMap(MAP_RADIUS, ctx.buildings);
    memoryStore.maps.set("mapHexes", ctx.mapHexes);
  }

  if (memoryStore.maps.has("nations")) {
    ctx.nations = memoryStore.maps.get("nations");
  } else {
    ctx.nations = generateNations({ buildings: ctx.buildings });
    memoryStore.maps.set("nations", ctx.nations);
  }

  if (memoryStore.maps.has("turn")) {
    ctx.turn = memoryStore.maps.get("turn");
  } else {
    memoryStore.maps.set("turn", ctx.turn);
  }

  if (memoryStore.maps.has("roads")) {
    ctx.roads = memoryStore.maps.get("roads");
  } else {
    memoryStore.maps.set("roads", ctx.roads);
  }

  if (memoryStore.maps.has("buildings")) {
    ctx.buildings = memoryStore.maps.get("buildings");
  } else {
    memoryStore.maps.set("buildings", ctx.buildings);
  }

  // DO NOT SEND MODIFIERS TO CLIENT FOR NOW
  if (memoryStore.maps.has("modifiers")) {
    ctx.modifiers = memoryStore.maps.get("modifiers");
  } else {
    memoryStore.maps.set("modifiers", ctx.modifiers);
  }

  if (memoryStore.maps.has("mails")) {
    ctx.mails = memoryStore.maps.get("mails");
  } else {
    memoryStore.maps.set("mails", ctx.mails);
  }
  return ctx;
}
