import { GameCtx } from "#trpc/index.js";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { GameMetadata } from "../server/memoryStore";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const gameSaveTable = pgTable(
  "saves",
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => usersTable.id),

    name: text("save_name").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    version: integer("version").notNull().default(0),

    metadata: jsonb().$type<GameMetadata>().notNull(),

    data: jsonb().$type<GameCtx>().notNull(),
  },
  (table) => [uniqueIndex("saves_user_updated_idx").on(table.userId, table.updatedAt)]
);
