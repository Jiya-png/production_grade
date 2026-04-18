import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Token bucket rate limiter
// Groq free tier: 30 requests per minute (1 request per 2 seconds)
// We use Upstash Redis (free tier) for distributed rate limiting

let limiter: Ratelimit | null = null;

function getLimiter() {
  if (!limiter) {
    // Using environment-based fallback for local dev
    // Production should use Upstash Redis with UPSTASH_REDIS_REST_URL
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && !process.env.UPSTASH_REDIS_REST_URL) {
      console.warn('UPSTASH_REDIS_REST_URL not set for production rate limiting');
    }

    // Create a rate limiter: 30 requests per 60 seconds = 1 request per 2 seconds
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.tokenBucket(
        30, // 30 tokens
        '60 s' // per 60 seconds
      ),
      analytics: true,
      prefix: 'groq_ratelimit'
    });
  }

  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter();
    const { success, remaining, reset } = await limiter.limit(identifier);

    return {
      success,
      remaining: Math.max(0, remaining),
      resetTime: reset,
      retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000)
    };
  } catch (err) {
    // If rate limiter fails, allow the request but log the error
    console.error('Rate limit check error:', err);
    return {
      success: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
      retryAfter: 0
    };
  }
}

// Per-user rate limit (optional, for tracking individual user usage)
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`);
}

// Per-IP rate limit (fallback for anonymous users)
export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${ip}`);
}
