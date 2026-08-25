import { populateWorld } from "../simulation/game.js";
import { getPlayerNation } from "../simulation/player.js";
import { and, desc, eq } from "drizzle-orm";
import { gameSaveTable } from "../db/schema.js";
import { GameCtx } from "../trpc/index.js";
import { db } from "../db/index.js";

type GameSave = {
  id: string;
  userId: string;

  version: number;

  metadata: GameMetadata;
  data: GameCtx;
};

export type GameMetadata = {
  createdAt: string;
  updatedAt: string;
  turn: number;
  playerNationId: string | undefined;
  nationsLeft: number;
};

export const memoryStore = {
  maps: new Map<string, GameSave>(), // key has to be gameId
};

export async function getGame({ userId, gameId }: { userId: string; gameId?: string }) {
  if (!gameId) return null;

  const [game] = await db
    .select()
    .from(gameSaveTable)
    .where(and(eq(gameSaveTable.userId, userId), eq(gameSaveTable.id, gameId)))
    .limit(1);

  if (!game) return null;

  return game;
}

export async function createNewGame(userId: string) {
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
    counters: {
      nextContractExecutionOrder: 0,
      nextMailCreationIndex: 0,
    },
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

  const [result] = await db
    .insert(gameSaveTable)
    .values({ ...game })
    .returning();

  return { gameId: result.id, metadata: result.metadata };
}

export async function updateGameSave({
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
  const game = await getGame({ userId, gameId });
  if (!game) return;

  const newMetadata = updateMetadata(gameCtx, game.metadata);

  const obj: GameSave = {
    ...game,
    version: game.version + 1,
    data: gameCtx,
    metadata: newMetadata,
  };

  await db
    .update(gameSaveTable)
    .set({ ...obj, updatedAt: new Date() })
    .where(
      and(
        eq(gameSaveTable.id, gameId),
        eq(gameSaveTable.userId, userId),
        eq(gameSaveTable.version, currVersion)
      )
    );
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

export async function getPlayerSaves(userId: string) {
  const saves = await db
    .select({
      id: gameSaveTable.id,
      userId: gameSaveTable.userId,
      metadata: gameSaveTable.metadata,
      version: gameSaveTable.version,
    })
    .from(gameSaveTable)
    .where(eq(gameSaveTable.userId, userId))
    .orderBy(desc(gameSaveTable.updatedAt));
  return saves;
}
