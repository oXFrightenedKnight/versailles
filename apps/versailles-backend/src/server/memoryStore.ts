import { generateNations } from "#services/genNations.js";
import { getPlayerNation } from "#services/player.js";
import { generateHexMap } from "../services/map.js";
import { GameCtx } from "../trpc/index.js";

type GameSave = {
  id: string;
  userId: string;

  version: number;

  metadata: GameMetadata;
  data: GameCtx;
};

type GameMetadata = {
  createdAt: string;
  updatedAt: string;
  turn: number;
  playerNationId: string | undefined;
  nationsLeft: number;
};

export const memoryStore = {
  maps: new Map<string, GameSave>(), // key has to be gameId
};

export function getSaveData({ userId, gameId }: { userId: string; gameId?: string }) {
  let playerMap = getGame({ userId, gameId });
  if (!playerMap) return null;

  return playerMap;
}

function getGame({ userId, gameId }: { userId: string; gameId?: string }) {
  const game = gameId ? memoryStore.maps.get(gameId) : null;
  if (!game) return null;
  if (game.userId !== userId) return null;

  return game;
}

export function createNewGame(userId: string) {
  const id = crypto.randomUUID();
  const ctx: GameCtx = {
    mapHexes: [],
    nations: [],
    turn: 0,
    roads: [],
    buildings: [],
    modifiers: [],
    mails: [],
    aiMemory: {},
    contracts: [],
    armyTraining: [],
  };
  populateWorld(ctx);

  const date = new Date().toISOString();

  const game: GameSave = {
    id,
    userId,
    version: 1,
    metadata: {
      createdAt: date,
      updatedAt: date,
      turn: 0,
      playerNationId: getPlayerNation(ctx)?.id,
      nationsLeft: ctx.nations.filter((n) => !n.isDefeated).length,
    },
    data: ctx,
  };

  memoryStore.maps.set(id, game);
  return game;
}

function populateWorld(ctx: GameCtx) {
  generateHexMap(ctx);
  generateNations(ctx);
}

export function updateStore({
  gameId,
  userId,
  gameCtx,
  currVersion,
}: {
  gameId: string;
  userId: string;
  gameCtx: GameCtx;
  currVersion: number;
}) {
  const game = memoryStore.maps.get(gameId);
  if (!game) return;
  if (game?.userId !== userId) return;

  // do not update if game versions don't match
  if (currVersion !== game.version) return;

  const newMetadata = updateMetadata(gameCtx, game.metadata);

  const obj = {
    ...game,
    version: game.version + 1,
    data: gameCtx,
    metadata: newMetadata,
  };

  memoryStore.maps.set(game.id, obj);
}

function updateMetadata(ctx: GameCtx, metadata: GameMetadata) {
  return {
    ...metadata,
    turn: ctx.turn,
    updatedAt: new Date().toISOString(),
    playerNationId: getPlayerNation(ctx)?.id,
    nationsLeft: ctx.nations.filter((n) => !n.isDefeated).length,
  } as GameMetadata;
}

export function getPlayerSaves(userId: string) {
  return [...memoryStore.maps.entries()]
    .filter(([_, save]) => save.userId === userId)
    .map((save) => save[1]);
}
