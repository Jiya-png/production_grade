import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Token bucket rate limiter
// Groq free tier: 30 requests per minute (1 request per 2 seconds)
// We use Upstash Redis (free tier) for distributed rate limiting

let limiter: Ratelimit | null = null;
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function getLimiter() {
  if (!limiter && process.env.UPSTASH_REDIS_REST_URL) {
    try {
      // Create a rate limiter: 30 requests per 60 seconds
      limiter = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.tokenBucket(30, '60 s', 1),
        analytics: true,
        prefix: 'groq_ratelimit'
      });
    } catch (err) {
      console.warn('Failed to initialize Upstash rate limiter:', err);
      limiter = null;
    }
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
    
    if (limiter) {
      // Use Upstash if available
      const { success, remaining, reset } = await limiter.limit(identifier);

      return {
        success,
        remaining: Math.max(0, remaining),
        resetTime: reset,
        retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000)
      };
    } else {
      // Fallback: in-memory rate limiting
      const now = Date.now();
      const data = ipRequestCounts.get(identifier);

      if (!data || now > data.resetTime) {
        // Reset: new window
        ipRequestCounts.set(identifier, {
          count: 1,
          resetTime: now + 60000 // 60 seconds from now
        });
        return { success: true, remaining: 29, resetTime: now + 60000 };
      }

      if (data.count >= 30) {
        // Rate limit exceeded
        return {
          success: false,
          remaining: 0,
          resetTime: data.resetTime,
          retryAfter: Math.ceil((data.resetTime - now) / 1000)
        };
      }

      // Increment and allow
      data.count++;
      return {
        success: true,
        remaining: 30 - data.count,
        resetTime: data.resetTime
      };
    }
  } catch (err) {
    // If rate limiter fails, allow the request but log
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