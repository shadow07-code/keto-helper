// Simple in-memory rate limiter: max 20 requests per IP per minute.
// Resets per serverless instance — sufficient to prevent casual abuse.

const store = new Map<string, { count: number; resetAt: number }>()

const MAX_REQUESTS = 20
const WINDOW_MS    = 60_000

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now  = Date.now()
  const slot = store.get(ip)

  if (!slot || now > slot.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSecs: 0 }
  }

  if (slot.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterSecs: Math.ceil((slot.resetAt - now) / 1000) }
  }

  slot.count++
  return { allowed: true, retryAfterSecs: 0 }
}
