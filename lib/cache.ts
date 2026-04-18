import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
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
    });

    redis.on('connect', () => {
      console.log('Redis client connected');
    });
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
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
    await client.setex(key, ttlSeconds, JSON.stringify(value));
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
