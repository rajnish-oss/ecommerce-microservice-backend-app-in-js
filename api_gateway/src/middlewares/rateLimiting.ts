import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "redis";
import { createClient } from "redis";

interface RateLimitResult {
    allowed: boolean; // was the request permitted?
    remaining: number; // how many requests are left in the current window/bucket
    limit: number; // the configured maximum
    retryAfter: number | null; // seconds until the client should retry (null if allowed)
    delay?: number | null; // optional wait time (leaky bucket shaping mode)
}

const LUA_SCRIPT = `
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window_seconds = tonumber(ARGV[2])

local count = redis.call('INCR', key)

if count == 1 then
  redis.call('EXPIRE', key, window_seconds)
end

local pttl = redis.call('PTTL', key)

return { count, pttl }
`;
interface FixedWindowConfig {
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_CONFIG = {
    maxRequests: 100,
    windowSeconds: 60,
}

const client = createClient();

export async function attempt(
  key: string,
  config: FixedWindowConfig = DEFAULT_CONFIG,
): Promise<RateLimitResult> {
  const redis = await client.connect();
  const { maxRequests, windowSeconds } = config;

  const result = (await redis.eval(LUA_SCRIPT, {
    keys: [key],
    arguments: [maxRequests.toString(), windowSeconds.toString()],
  })) as number[];

  const count = result[0];
  const pttl = result[1];

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  let retryAfter: number | null = null;
  if (!allowed) {
    retryAfter = pttl > 0 ? pttl / 1000 : windowSeconds;
  }

  return { allowed, remaining, limit: maxRequests, retryAfter };
}


export async function rateLimitMiddleware({req, res, next}:{req:any, res:any, next:any}) {
    try {
      const key = `ratelimit:${req.ip}`; // or API key / user id

      const result = await attempt(key);
      const { allowed, remaining, limit, retryAfter } = result;

      // Optional: expose headers for clients
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      if (retryAfter != null) {
        res.setHeader("Retry-After", String(Math.ceil(retryAfter)));
      }

      if (!allowed) {
        return res.status(429).json({
          error: "Too Many Requests",
          retryAfter,
        });
      }

      return next();
    } catch (err) {
      // On errors, fail open or closed depending on your policy.
      // Most APIs prefer to fail open (let the request through).
      return next(err);
    }
  };