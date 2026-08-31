import { getAuth } from "@hono/clerk-auth";
import { Redis } from "@upstash/redis";
import { Context } from "hono";
import { rateLimiter, RedisStore } from "hono-rate-limiter";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// trust IP headers because Vercel automatically rewrites them.
const ipKeyGenerator = (c: Context) =>
  c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

const authKeyGenerator = (c: Context) => getAuth(c)?.userId ?? ipKeyGenerator(c);

export const authLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 250,
  keyGenerator: authKeyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:auth:" }),
});
export const defaultLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 50,
  keyGenerator: authKeyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:default:" }),
});
export const contactLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: ipKeyGenerator,
  store: new RedisStore({ client: redis, prefix: "rl:contact:" }),
});
