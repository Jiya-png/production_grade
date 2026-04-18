import Redis from 'ioredis';

let redis: Redis | null = null;
const inMemoryCache = new Map<string, { value: string; expiresAt: number }>();

function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        }
      });

      redis.on('error', (err) => {
        console.error('Redis client error:', err);
        redis = null;
      });

      redis.on('connect', () => {
        console.log('Redis client connected');
      });
    } catch (err) {
      console.warn('Failed to connect to Redis, using in-memory cache');
      redis = null;
    }
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (client) {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } else {
      // Use in-memory cache as fallback
      const cached = inMemoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return JSON.parse(cached.value) as T;
      }
      inMemoryCache.delete(key);
    }
    return null;
  } catch (err) {
    console.error('Cache get error:', err);
    return null; // Fail gracefully — continue without cache
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const client = getRedis();
    if (client) {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      // Use in-memory cache as fallback
      inMemoryCache.set(key, {
        value: JSON.stringify(value),
        expiresAt: Date.now() + ttlSeconds * 1000
      });
    }
  } catch (err) {
    console.error('Cache set error:', err);
    // Fail gracefully — continue without caching
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (err) {
    console.error('Cache delete error:', err);
  }
}

export function generateCacheKey(owner: string, repo: string, level: string): string {
  return `repo:${owner}:${repo}:${level}`;
}

export function generateFileCacheKey(owner: string, repo: string, path: string, level: string): string {
  return `file:${owner}:${repo}:${path}:${level}`;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}