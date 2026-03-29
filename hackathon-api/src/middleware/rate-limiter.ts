/* ──────────────────────────────────────────────────
   hackathon-api — In-Memory Rate Limiter
   Token bucket algorithm per IP address.
   Protects Gemini API from abuse.
   ────────────────────────────────────────────────── */

import { Request, Response, NextFunction } from 'express'

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

const RATE_LIMIT_CONFIG = {
  tokensPerWindow: parseInt(process.env.RATE_LIMIT_REQUESTS ?? '30'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000'),  // 1 minute
  geminiRoutes: ['/api/health/ask', '/api/health/forecast', '/api/health/insights', '/api/health/mealplan', '/api/health/compare'],
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
    ?? req.socket.remoteAddress
    ?? 'unknown'

  const isGeminiRoute = RATE_LIMIT_CONFIG.geminiRoutes.some(r => req.path.startsWith(r))

  // Only rate limit Gemini-calling routes
  if (!isGeminiRoute) {
    next()
    return
  }

  const now = Date.now()
  let bucket = buckets.get(ip)

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CONFIG.tokensPerWindow, lastRefill: now }
    buckets.set(ip, bucket)
  }

  // Refill tokens proportionally based on elapsed time
  const elapsed = now - bucket.lastRefill
  const refill = (elapsed / RATE_LIMIT_CONFIG.windowMs) * RATE_LIMIT_CONFIG.tokensPerWindow
  bucket.tokens = Math.min(RATE_LIMIT_CONFIG.tokensPerWindow, bucket.tokens + refill)
  bucket.lastRefill = now

  if (bucket.tokens < 1) {
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / RATE_LIMIT_CONFIG.tokensPerWindow * RATE_LIMIT_CONFIG.windowMs)
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      limit: RATE_LIMIT_CONFIG.tokensPerWindow,
      windowSeconds: RATE_LIMIT_CONFIG.windowMs / 1000,
    })
    return
  }

  bucket.tokens -= 1

  // Expose rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.tokensPerWindow)
  res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens))
  res.setHeader('X-RateLimit-Reset', Math.ceil((bucket.lastRefill + RATE_LIMIT_CONFIG.windowMs) / 1000))

  next()
}

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_CONFIG.windowMs * 2
  for (const [ip, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(ip)
  }
}, 5 * 60 * 1000)
