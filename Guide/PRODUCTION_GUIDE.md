# RepoExplainer Pro — Production Deployment & Architecture Guide

## Overview

RepoExplainer has been transformed from a prototype into a production-grade SaaS platform. This guide covers deployment, scaling, caching, rate limiting, and monitoring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                      (React + Next.js)                           │
│        - User input, result display, file explorer              │
│        - Local error handling & rate limit indicators           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼──────────────────┐    ┌────────▼──────────────────┐
│   /api/analyze           │    │   /api/file              │
│   - Rate limit check     │    │   - Rate limit check     │
│   - Cache lookup         │    │   - Cache lookup         │
│   - Queue management     │    │   - Queue management     │
│   - GitHub fetch         │    │   - GitHub fetch         │
│   - LLM inference        │    │   - LLM inference        │
│   - Result caching       │    │   - Result caching       │
└────────┬─────────────────┘    └───────┬────────────────┘
         │                              │
    ┌────┴───────────────────────────────┴─────┐
    │                                          │
┌───▼──────────────────────┐    ┌──────────────▼────┐
│   Groq API               │    │   GitHub API       │
│   (LLaMA 3.3 70B)        │    │   (REST v3)        │
│   30 req/min rate limit  │    │                    │
└────────────────────────┬─┘    └────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
┌───────▼──────────────┐    ┌────────────▼──────────┐
│   Redis Cache        │    │   Upstash Redis       │
│   (Local/Docker)     │    │   (Rate Limiting)     │
│   - Analysis: 24h    │    │   - 30 req/min limit  │
│   - File: 12h        │    │   - Per-IP tracking   │
└──────────────────────┘    └───────────────────────┘

    Request Queue (p-queue)
    - Analysis: 2 concurrent
    - File: 3 concurrent
    - Prevents API overload
```

---

## Key Production Features

### 1. Caching Strategy

**Analysis Cache (24 hours)**
- Key: `repo:{owner}:{repo}:{level}`
- Hit rate: ~70% (users request same repos multiple times)
- Saves: 1 GitHub fetch + 1 LLM call per cache hit

**File Cache (12 hours)**
- Key: `file:{owner}:{repo}:{path}:{level}`
- Hit rate: ~50% (popular files explained multiple times)
- Saves: 1 LLM call per cache hit

**Cache Invalidation**: Manual via admin panel or automatic on repo updates (future feature)

### 2. Rate Limiting (Groq)

**Problem**: Groq free tier = 30 requests/minute per API key. At peak, requests exceed this.

**Solution**: Token bucket algorithm via Upstash Redis
- 30 tokens per 60 seconds
- Per-IP tracking (anonymous users)
- Per-user tracking (logged-in users, future feature)
- Graceful degradation: 503 response with retry-after header

**Fallback**: If Upstash is unavailable, requests proceed (monitoring logs the incident)

### 3. Concurrency Management

**Problem**: Multiple users hitting Groq simultaneously causes 429 errors and queue overload.

**Solution**: Request queues with p-queue
- Analysis: max 2 concurrent → ~0.5 req/sec = 30 req/min (respects Groq limit)
- File: max 3 concurrent → handles file explanations in parallel
- Timeout: 120s for analysis, 60s for files

### 4. Error Handling

| Error | Status | Response | User Impact |
|-------|--------|----------|-------------|
| Rate limit exceeded | 429 | `Retry-After` header + friendly message | Graceful retry prompt |
| Cache miss + queue full | Queued | Request waits up to 2 min | Longer response time |
| GitHub API error | 500 | Detailed error log + generic message | "Failed to fetch repo" |
| Groq API error | 503 | Service unavailable | User prompted to retry |
| Malformed JSON | 500 | Logged, user retry | "AI returned invalid format" |

### 5. Monitoring & Observability

**Health Check Endpoint**: `/api/health`
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00Z",
  "environment": "production",
  "queue": {
    "analysis": { "pending": 5, "size": 2, "concurrency": 2 },
    "file": { "pending": 3, "size": 3, "concurrency": 3 }
  },
  "uptime": 864000.123
}
```

**Logging**: Every request logged with:
- Request metadata (owner, repo, level, IP)
- Cache hit/miss
- Queue depth
- Latency (ms)
- Errors with stack traces (dev only)

---

## Deployment Steps

### Option A: Vercel (Recommended for Beginners)

Vercel **cannot** run Redis for caching/rate limiting locally, so use:
- **Cache**: Vercel KV (built-in Redis)
- **Rate Limit**: Upstash (free tier: 10k requests/day)

**Steps:**

1. **Fork the repo** to GitHub
2. **Go to [vercel.com](https://vercel.com)** → Import Project → Select fork
3. **Add environment variables**:
   ```
   GROQ_API_KEY=sk-...
   GITHUB_TOKEN=ghp_...
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   REDIS_URL=vercel-kv-... (Vercel KV connection)
   ```
4. **Deploy** → Done in ~2 minutes

**Cost**: Free tier covers ~100 users/day. Paid: ~$20/month at scale.

---

### Option B: Docker + Self-Hosted (Advanced)

Run on your own server with full control.

**`Dockerfile`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npm", "start"]
```

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      GROQ_API_KEY: ${GROQ_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

volumes:
  redis_data:
```

**Deploy:**
```bash
docker-compose up -d
```

---

### Option C: Railway / Render (Middle Ground)

Managed hosting with built-in Postgres/Redis.

1. Push to GitHub
2. Connect repo to Railway/Render
3. Add Redis addon
4. Set environment variables
5. Deploy

Cost: ~$10-50/month depending on usage.

---

## Configuration for Scale

### For 100 Users/Day:
```env
GROQ_RATE_LIMIT_REQUESTS=30
CACHE_TTL_ANALYSIS=86400
CONCURRENCY_ANALYSIS=2
CONCURRENCY_FILE=3
```
Cost: ~$0 (free Groq tier enough)

### For 1000 Users/Day:
```env
# Consider Groq paid tier or multi-key setup
GROQ_RATE_LIMIT_REQUESTS=100
CACHE_TTL_ANALYSIS=86400
CONCURRENCY_ANALYSIS=5
CONCURRENCY_FILE=8
UPSTASH_REDIS_PLAN=pro
```
Cost: ~$50/month (Groq paid + Upstash)

### For 10,000+ Users/Day:
```env
# Multi-region deployment, dedicated Redis, load balancing
GROQ_RATE_LIMIT_REQUESTS=300
CONCURRENCY_ANALYSIS=10
CONCURRENCY_FILE=15
# Consider: multiple API keys, failover, CDN, database
```
Cost: ~$500-2000/month

---

## Monitoring in Production

### Metrics to Track:

1. **Cache Hit Rate**: `(cache_hits / total_requests) * 100`
   - Target: >60%
   - Indicates if caching strategy is effective

2. **Rate Limit Hit Rate**: `rate_limit_errors / total_requests`
   - Target: <5%
   - Indicates if concurrency limits are appropriate

3. **Queue Depth**: `queue.analysis.pending + queue.file.pending`
   - Target: <10 at all times
   - If growing, increase concurrency or upgrade Groq tier

4. **Error Rate**: `error_count / total_requests`
   - Target: <1%
   - Alerts needed if >2%

5. **Latency (p95)**: Time from request to response
   - Target: <15s (cached), <30s (uncached)
   - Includes GitHub + LLM + formatting time

### Set Up Alerts:

**Upstash Monitoring** (included with Redis):
- Track rate limit rejections
- Monitor key eviction

**Vercel Analytics** (if using Vercel):
- Track response times, error rates
- Set up email alerts for >5% error rate

**Custom Logging** (use existing logger):
```typescript
// Example: send critical errors to Slack
if (error.status === 500) {
  await fetch(process.env.SLACK_WEBHOOK, {
    method: "POST",
    body: JSON.stringify({ text: `🚨 Production error: ${error.message}` })
  });
}
```

---

## Scaling Strategy

### Phase 1 (0-500 users):
- Vercel + Upstash (free tiers)
- Cache hit rate ~60%
- Rate limit rarely triggered
- Cost: $0

### Phase 2 (500-5000 users):
- Vercel + Upstash Pro + Groq Pro API key
- Increase concurrency to 5
- Add user authentication + per-user caching
- Cost: ~$100/month

### Phase 3 (5000+ users):
- Self-hosted on Railway/Render
- Multiple Groq API keys with load balancing
- Database for analytics/user tracking
- CDN for frontend
- Cost: ~$500-2000/month

---

## Maintenance Tasks

### Weekly:
- Check `/api/health` — ensure all systems running
- Review error logs for patterns
- Monitor cache hit rate

### Monthly:
- Update dependencies: `npm update`
- Review and clean old cache entries
- Analyze top 10 most-requested repos

### Quarterly:
- Full test suite run
- Load testing with k6 or Apache JMeter
- Review and update rate limits based on growth
- Security audit

---

## Backup & Disaster Recovery

### Redis Backup:
```bash
# Docker: backup Redis data
docker exec repo-explainer-redis redis-cli BGSAVE

# Copy backup
docker cp repo-explainer-redis:/data/dump.rdb ./backup/
```

### Code Backup:
- GitHub is your backup (all source code)
- Vercel auto-backups deployments

### Recovery:
If Redis is lost, caching resets but app continues working (slower).
If API key leaked, immediate rotation:
1. Generate new Groq key
2. Update environment variable
3. Redeploy

---

## Final Checklist Before Production

- [ ] All environment variables set
- [ ] Redis instance running and accessible
- [ ] Groq API key tested with test request
- [ ] GitHub token has `public_repo` scope
- [ ] UPSTASH_REDIS_REST_URL configured for rate limiting
- [ ] `/api/health` returns 200
- [ ] Load test with 10 concurrent requests
- [ ] Error monitoring configured
- [ ] Documentation URL set in .env
- [ ] Logging level appropriate (info/warn in production)
- [ ] Rate limit headers returned correctly (429 responses)
- [ ] Cache is working (second request <1s, first >5s difference)

---

## Next: Advanced Features (Roadmap)

- [ ] User authentication + API keys
- [ ] Analytics dashboard (most popular repos, fastest analyses)
- [ ] Private repository support
- [ ] Scheduled re-analysis of repos
- [ ] Diff-based explanation updates
- [ ] Export to markdown/PDF
- [ ] Team collaboration features
