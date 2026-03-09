import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async function isAuthed(opts) {
  if (!opts.ctx.clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      clerkId: opts.ctx.clerkId,
    },
  });
});
