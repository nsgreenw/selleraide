import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

let strictLimiter: Ratelimit | null = null;
let standardLimiter: Ratelimit | null = null;
let publicLimiter: Ratelimit | null = null;

/** 10 requests per 60s — auth endpoints (IP-based) */
export function getStrictLimiter(): Ratelimit {
  if (!strictLimiter) {
    strictLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:strict",
    });
  }
  return strictLimiter;
}

/** 20 requests per 60s — authenticated AI/mutation routes (user ID-based) */
export function getStandardLimiter(): Ratelimit {
  if (!standardLimiter) {
    standardLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "rl:standard",
    });
  }
  return standardLimiter;
}

/** 30 requests per 60s — unauthenticated public endpoints (IP-based) */
export function getPublicLimiter(): Ratelimit {
  if (!publicLimiter) {
    publicLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "rl:public",
    });
  }
  return publicLimiter;
}

/** Extract client IP from request headers */
export function getIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
