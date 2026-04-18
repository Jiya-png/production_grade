# RepoExplainer Pro — Quick Start (5 Minutes)

## Prerequisites

- Node.js 18+
- npm or yarn
- GitHub account
- Groq API key (free from [aistudio.google.com](https://aistudio.google.com))
- Upstash account (free tier at [upstash.com](https://upstash.com))

---

## Local Setup (Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env.local`

```
GROQ_API_KEY=your-groq-key-here
GITHUB_TOKEN=your-github-token-here
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
NODE_ENV=development
```

### 3. Run Redis Locally (Docker)

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

Or install Redis directly on macOS:
```bash
brew install redis
redis-server
```

### 4. Start Dev Server

```bash
npm run dev
```

Go to [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (1 Click)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/repo-explainer.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New...** → **Project**
3. Select your GitHub repo
4. Click **Deploy**

### Step 3: Add Environment Variables

After deployment, go to **Settings** → **Environment Variables**:

```
GROQ_API_KEY = sk-...
GITHUB_TOKEN = ghp_...
UPSTASH_REDIS_REST_URL = https://...
UPSTASH_REDIS_REST_TOKEN = ...
REDIS_URL = (Vercel auto-creates this)
LOG_LEVEL = info
NODE_ENV = production
```

To get **Upstash credentials**:
1. Go to [upstash.com](https://upstash.com) → Sign up (free)
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Paste into Vercel

Your app is now live at: `https://your-project.vercel.app`

---

## Deploy to Docker (Self-Hosted)

### Option A: Local Docker

```bash
# Build image
docker build -t repo-explainer .

# Run with docker-compose
docker-compose up -d

# Check it's running
curl http://localhost:3000/api/health
```

### Option B: Railway (Easiest Self-Hosted)

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repo
4. Add Redis plugin (one click)
5. Set environment variables
6. Deploy

Cost: Free tier covers ~100 users/day. Paid from $5/month.

---

## What's Included

✅ **Caching** — Redis-backed, 24h for repos, 12h for files  
✅ **Rate Limiting** — Upstash-backed token bucket (30 req/min)  
✅ **Concurrency** — Queue system (2 analysis + 3 file concurrent)  
✅ **Error Handling** — Graceful fallbacks, detailed logging  
✅ **Monitoring** — `/api/health` endpoint, structured logs  
✅ **Frontend** — Beautiful, responsive React UI with loading states  

---

## Testing Before Launch

### Test 1: Check Health

```bash
curl https://your-app.vercel.app/api/health
```

Response should be:
```json
{
  "status": "healthy",
  "queue": { "analysis": { "pending": 0 }, "file": { "pending": 0 } }
}
```

### Test 2: Single Repo Analysis

```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/expressjs/express","level":"beginner"}'
```

Should return JSON with summary, tech stack, etc. in <20 seconds.

### Test 3: Cached Response

Repeat the same request. Should return in <1 second and include `_cached: true`.

### Test 4: Load Test (10 Concurrent)

```bash
# Install hey tool
go install github.com/rakyll/hey@latest

# Run 10 concurrent requests
hey -n 10 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/expressjs/express","level":"beginner"}' \
  https://your-app.vercel.app/api/analyze
```

Expected: All succeed, no 429 errors (rate limiting is per-IP, so this single IP gets queued).

---

## Monitoring in Production

### View Logs

**Vercel**: Dashboard → Functions → Logs  
**Railway**: Dashboard → Deployments → Logs  
**Docker**: `docker-compose logs -f app`

### Check Rate Limiting

```bash
# Make 40 requests (exceeds 30/min limit)
for i in {1..40}; do
  curl -X POST https://your-app.vercel.app/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url":"https://github.com/expressjs/express","level":"beginner"}'
  echo "Request $i"
done
```

After ~30 requests, you should see 429 responses with `retryAfter` header.

---

## Troubleshooting

### Issue: "Redis connection failed"

**On Vercel**: Redis addon wasn't created. Go to Settings → Integrations → Add Vercel KV.

**On Docker**: Redis isn't running. Check: `docker ps | grep redis`

### Issue: "Rate limit exceeded immediately"

Upstash isn't configured. Check `UPSTASH_REDIS_REST_URL` is set correctly.

Fallback: Remove Upstash config to disable rate limiting (not recommended for production).

### Issue: "Groq API key invalid"

1. Check key starts with `sk-`
2. Go to [aistudio.google.com](https://aistudio.google.com) and regenerate
3. Update environment variable
4. Redeploy

### Issue: Cache not working

Check Redis connection:
```bash
redis-cli ping
# Should return: PONG
```

If on Vercel, verify Vercel KV was added and URL is correct.

---

## Next Steps

1. **Share the link** — Send to friends/colleagues
2. **Collect feedback** — Add to product via logs
3. **Monitor metrics** — Track cache hit rate, errors, latency
4. **Optimize** — Increase concurrency/cache TTL as needed
5. **Monetize** — Add API tier, premium features

---

## Useful Links

- **Groq Console**: https://console.groq.com
- **Upstash Console**: https://console.upstash.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app
- **GitHub**: https://github.com

---

## Need Help?

- Check logs in `/PRODUCTION_GUIDE.md`
- Test with `/api/health` endpoint
- Review error messages carefully
- Ensure all 4 environment variables are set

Good luck! 🚀
