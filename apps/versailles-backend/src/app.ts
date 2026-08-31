// constructs and exports hono app

import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { contactHandler } from "./api/contact/route";
import { authLimiter, contactLimiter, defaultLimiter } from "./middleware/rateLimiters";
import { appRouter } from "./trpc/index.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// only use for trpc right now
app.use(
  "/trpc/*",
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })
);

{
  /* TRPC ENDPOINT */
}

app.use("/trpc/*", async (c, next) => {
  const { userId } = getAuth(c);

  if (userId) return authLimiter(c, next);
  return defaultLimiter(c, next);
});

app.all("/trpc/*", async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({ error: "You are not logged in!" }, 401);
  }

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ clerkId: auth.userId }),
    onError({ error, path, input }) {
      console.error(`[tRPC ERROR] ${path}`);

      console.error({
        message: error.message,
        code: error.code,
        input,
        stack: error.stack,
      });
    },
  });
});

app.post("/api/contact", contactLimiter, contactHandler);

export default app;
