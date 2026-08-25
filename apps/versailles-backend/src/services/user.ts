import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { usersTable } from "../db/schema";
import { createClerkClient } from "@clerk/backend";

export async function getOrCreateUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (user) return user;

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const clerkUser = await clerk.users.getUser(clerkId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? "unknown@user";

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      name: clerkId,
      email: email,
    })
    .onConflictDoNothing()
    .returning();

  return created;
}
