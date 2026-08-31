import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/index.js";
import { rateLimiter, RedisStore } from "hono-rate-limiter";
import { Redis } from "@upstash/redis";
import { contactHandler } from "./api/contact/route";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  "*",
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })
);

app.all("/trpc/*", async (c) => {
  const auth = getAuth(c);

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ clerkId: auth?.userId ?? null }),
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

app.use("/trpc/*", async (c, next) => {
  const { userId } = getAuth(c);

  if (userId) return authLimiter(c, next);
  return defaultLimiter(c, next);
});

app.post("/api/contact", async (c, next) => {
  return contactHandler(c, next);
});
app.use("/api/contact", async (c, next) => {
  return contactLimiter(c, next);
});

// trust IP headers because Vercel automatically rewrites them.
const keyGenerator = (c: any) =>
  getAuth(c)?.userId ??
  c.req.header("x-real-ip") ??
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";
const authLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 250,
  keyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:auth:" }),
});
const defaultLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 50,
  keyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:default:" }),
});
const contactLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:contact:" }),
});

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
