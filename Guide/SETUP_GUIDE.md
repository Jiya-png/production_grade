# Complete Setup Guide: From Development to Production

## Table of Contents
1. Development Setup
2. Production Configuration
3. Deployment Options
4. Monitoring & Scaling
5. Troubleshooting

---

## Part 1: Development Setup (Local Machine)

### Step 1: Clone and Install

```bash
# Clone the repo
git clone https://github.com/your-username/repo-explainer.git
cd repo-explainer

# Install dependencies
npm install

# Install Redis (if not using Docker)
# macOS:
brew install redis

# Ubuntu/Debian:
sudo apt-get install redis-server

# Or use Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### Step 2: Get Your API Keys

**Groq API Key:**
1. Go to https://console.groq.com
2. Sign up (free)
3. Go to API Keys
4. Create new API key
5. Copy it (starts with `sk-`)

**GitHub Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it "repo-explainer"
4. Select `public_repo` scope only
5. Generate and copy

**For Upstash (Rate Limiting, Optional for Local Dev):**
1. Go to https://upstash.com
2. Sign up (free)
3. Create Redis database
4. Copy REST endpoint and token

### Step 3: Create `.env.local`

```bash
cat > .env.local << 'EOF'
GROQ_API_KEY=sk-your-key-here
GITHUB_TOKEN=ghp_your-token-here
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
NODE_ENV=development
EOF
```

### Step 4: Start Redis

```bash
# Option A: Homebrew
redis-server

# Option B: Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Test connection
redis-cli ping
# Should return: PONG
```

### Step 5: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### Verify Everything Works

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test analysis endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/expressjs/express","level":"beginner"}'
```

---

## Part 2: Production Configuration

### Architecture Decision

Choose based on your user base:

| Users/Day | Platform | Cost | Effort |
|-----------|----------|------|--------|
| 0-100 | Vercel | Free | 5 min |
| 100-1000 | Vercel + Upstash | $20/mo | 10 min |
| 1000+ | Self-hosted | $100-500/mo | 30 min |

---

## Part 3: Deploy to Vercel (Easiest)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Create Vercel Project

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repo
4. Click "Deploy"

### Step 3: Add Redis (for Caching)

In Vercel Dashboard:
1. Go to your project → Settings → Storage
2. Click "Create Database" → select "Vercel KV"
3. Name it "redis"
4. Vercel auto-creates `REDIS_URL` environment variable

### Step 4: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
GROQ_API_KEY = sk-...
GITHUB_TOKEN = ghp_...
LOG_LEVEL = info
NODE_ENV = production
```

For rate limiting (optional, recommended):
```
UPSTASH_REDIS_REST_URL = https://...
UPSTASH_REDIS_REST_TOKEN = ...
```

To get Upstash credentials:
1. Go to https://console.upstash.com
2. Create Redis database (free tier)
3. Copy REST API credentials
4. Paste into Vercel

### Step 5: Redeploy

Vercel auto-redeploys when you push to GitHub. Or manually trigger:
1. Vercel Dashboard → Deployments
2. Click "..." → "Redeploy"

### Step 6: Test Production

```bash
# Replace with your Vercel URL
curl https://your-project.vercel.app/api/health

curl -X POST https://your-project.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/expressjs/express","level":"beginner"}'
```

Your app is now live! 🎉

---

## Part 4: Deploy with Docker (Self-Hosted)

### Step 1: Create Dockerfile

Already in the repo (uses Next.js builder pattern).

### Step 2: Build and Run

```bash
# Build image
docker build -t repo-explainer .

# Run with environment variables
docker run -p 3000:3000 \
  -e GROQ_API_KEY=sk-... \
  -e GITHUB_TOKEN=ghp_... \
  -e REDIS_URL=redis://redis:6379 \
  repo-explainer
```

### Step 3: Use Docker Compose (Recommended)

Create `docker-compose.yml` (in repo):

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      GROQ_API_KEY: ${GROQ_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: info
      NODE_ENV: production
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

Create `.env` file in project root:

```
GROQ_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

Run:

```bash
docker-compose up -d
```

Access at http://localhost:3000

---

## Part 5: Deploy to Railway (Middle Ground)

### Step 1: Connect GitHub

1. Go to https://railway.app
2. Click "Create new project" → "Deploy from GitHub"
3. Select your repo
4. Railway auto-deploys

### Step 2: Add Redis

1. In Railway dashboard, click "Add Service"
2. Select "Redis"
3. Railway auto-creates connection URL

### Step 3: Set Environment Variables

In Railway project settings, add:

```
GROQ_API_KEY = sk-...
GITHUB_TOKEN = ghp_...
LOG_LEVEL = info
NODE_ENV = production
REDIS_URL = ${{ REDIS_URL }} (Railway auto-sets)
```

### Step 4: Deploy

Railway auto-detects Next.js and deploys. Get your URL from dashboard.

Cost: $5/month for 50GB/month bandwidth (covers ~1000 users/day)

---

## Part 6: Monitoring & Observability

### Health Check

All deployments should respond to:

```bash
curl https://your-app.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00Z",
  "queue": {
    "analysis": { "pending": 0, "size": 2 },
    "file": { "pending": 0, "size": 3 }
  },
  "uptime": 3600000
}
```

### Monitor Cache Hit Rate

From logs, count:
- `Cache hit` messages
- Total requests
- Hit rate = hits / total

**Target**: >60%

If <40%, consider:
- Increasing `CACHE_TTL_ANALYSIS` to 172800 (2 days)
- More diverse user base

### Monitor Rate Limiting

From logs, count:
- `Rate limit exceeded` messages
- Total requests
- Rate = limit errors / total

**Target**: <5%

If >10%, consider:
- Upgrade Groq to paid tier
- Add multiple API keys with load balancing
- Increase `GROQ_RATE_LIMIT_REQUESTS` (if using Groq paid)

### Monitor Errors

From logs, watch for:
- GitHub 404 (invalid repos)
- Groq 429 (actual rate limit)
- Parse errors (malformed JSON from LLM)
- Queue timeouts

**Alert** if error rate >1%.

### Set Up Alerts

**Vercel Alerts:**
1. Vercel Dashboard → Settings → Analytics → Alerts
2. Create alert for >5% error rate
3. Get email on trigger

**Upstash Alerts:**
1. Upstash console → Redis instance → Alerts
2. Alert on high latency or errors

**DIY Slack Alerts:**

In your code, add:

```typescript
if (error.status === 500) {
  await fetch(process.env.SLACK_WEBHOOK, {
    method: "POST",
    body: JSON.stringify({
      text: `🚨 Production error:\n${error.message}`
    })
  });
}
```

---

## Part 7: Scaling Strategy

### Phase 1: 0-100 Users/Day (Free)

- Vercel + Vercel KV
- No Upstash needed (rate limiting can be disabled)
- Cost: $0
- Setup time: 5 minutes

**Config:**
```env
GROQ_RATE_LIMIT_REQUESTS=30
CACHE_TTL_ANALYSIS=86400
```

### Phase 2: 100-1000 Users/Day ($20/mo)

- Vercel + Vercel KV + Upstash
- Groq free tier may hit limits → get Groq Pro API key
- Cost: ~$20/mo
- Setup time: 15 minutes

**Config:**
```env
GROQ_API_KEY=sk-... (Groq Pro)
GROQ_RATE_LIMIT_REQUESTS=100
CACHE_TTL_ANALYSIS=86400
```

### Phase 3: 1000-5000 Users/Day ($50-100/mo)

- Self-hosted on Railway/Render
- Multiple Groq API keys with round-robin
- Database for analytics
- Cost: ~$50-100/mo
- Setup time: 1 hour

### Phase 4: 5000+ Users/Day ($500+/mo)

- Multi-region deployment
- Load balancer (Cloudflare)
- Dedicated Redis instances
- Multiple Groq accounts
- Database with caching layer
- CDN for frontend

---

## Part 8: Troubleshooting

### Issue: "Cannot find module 'ioredis'"

**Fix:**
```bash
npm install ioredis
npm install @upstash/ratelimit @upstash/redis
npm install p-queue
npm run build
```

### Issue: "Redis connection refused"

**Check Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**If not running:**
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Or on macOS:
brew services start redis
```

**On Vercel:** Vercel KV not added. Go to Settings → Storage → Add KV.

### Issue: "GROQ_API_KEY is not defined"

1. Check `.env.local` has the key
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. On Vercel: Go to Settings → Environment Variables, confirm key is there

### Issue: "Rate limit errors on first request"

Upstash might not be configured. Either:
1. Set `UPSTASH_REDIS_REST_URL` correctly, OR
2. Disable rate limiting (remove Upstash config — requests will proceed)

### Issue: "Cache not working"

1. Check Redis is running: `redis-cli ping`
2. Check `REDIS_URL` is correct
3. Check logs for "Cache set error" messages

If Redis is down, app continues working (just slower, without caching).

### Issue: "Deployment stuck"

**On Vercel:**
- Check build logs: Dashboard → Deployments → [latest] → Logs
- Likely missing environment variable

**On Railway:**
- Check logs: Railway dashboard → [project] → Logs
- Likely Node.js version issue (need >=18)

### Issue: "502 Bad Gateway"

- Check health endpoint: `curl your-app.com/api/health`
- If 502: Server is down, check deployment logs
- If 200: Issue is in specific routes, check logs

---

## Quick Reference

### Local Development
```bash
npm install
redis-server          # In another terminal
npm run dev           # Visit http://localhost:3000
```

### Deploy to Vercel (5 min)
```bash
git push origin main
# Go to vercel.com, click Deploy
# Add environment variables in dashboard
```

### Deploy with Docker
```bash
docker-compose up -d
# App at http://localhost:3000
# Redis auto-created
```

### Monitor Health
```bash
curl https://your-app.com/api/health
```

### View Logs
- Vercel: Dashboard → Functions → Logs
- Railway: Dashboard → Logs  
- Local: Terminal running `npm run dev`

---

## Checklist: Before Going Live

- [ ] All 3 API keys obtained (Groq, GitHub, Upstash)
- [ ] `.env.local` created with all keys
- [ ] Redis running locally: `redis-cli ping` returns PONG
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3000 loads
- [ ] `/api/health` returns 200
- [ ] Sample analysis works
- [ ] Cached response is fast
- [ ] GitHub repo pushed to main
- [ ] Vercel/Railway project created
- [ ] Environment variables set in production
- [ ] Production `/api/health` returns 200
- [ ] Production analysis works
- [ ] Rate limiting tested (40 concurrent requests)
- [ ] Logs are readable and informative

---

## You're Ready! 🚀

Your app is now production-ready. Share the URL and watch the metrics grow!

Next: Set up monitoring, collect user feedback, plan features.
