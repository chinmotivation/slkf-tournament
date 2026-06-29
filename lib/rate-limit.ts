// Simple in-process rate limiter using a sliding-window token-bucket approach.
//
// ⚠️  PRODUCTION NOTE: This implementation is process-local. In a multi-instance
// or serverless deployment (Vercel Edge, multiple Node processes) each instance
// maintains its own counter, so the effective limit is multiplied by the
// instance count. For production, replace the store with an Upstash Redis
// client using @upstash/ratelimit.

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

// Prune expired entries every 5 minutes to avoid unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of store) {
      if (bucket.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number
  /** Window duration in seconds. */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check and consume one token for the given key.
 * Returns { allowed: false } when the limit is exceeded.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowMs = opts.windowSeconds * 1000

  let bucket = store.get(key)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs }
    store.set(key, bucket)
  }

  if (bucket.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { allowed: true, remaining: opts.limit - bucket.count, resetAt: bucket.resetAt }
}
