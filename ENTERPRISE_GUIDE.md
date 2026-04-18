# RepoExplainer Pro — Enterprise Deployment Guide

## Phase 2/3: Adding User Authentication & Analytics

This guide covers scaling to 1000+ users with per-user API keys, analytics, and monetization.

---

## Architecture Upgrade

```
OLD (Phase 1):
User → Vercel → Groq API
       ↓
    Redis (cache)
    
NEW (Phase 2+):
User (with API key) → Vercel → PostgreSQL
                             → Rate Limiter (user quota)
                             → Groq API
                             ↓
                          Redis (cache)
                          Analytics logged to DB
```

---

## 1. Database Setup

### Option A: Use Vercel Postgres (Easiest)

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Add Postgres
vercel env add POSTGRES_PRISMA_URL
```

Vercel auto-creates a Postgres database. Get the connection string from the dashboard.

### Option B: Self-Hosted Postgres

```bash
# Docker
docker run -d \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=repoexplainer \
  -p 5432:5432 \
  postgres:15

# Or use a managed service: Neon (free), Supabase, Railway
```

### Option C: Neon (Free PostgreSQL Hosting)

1. Go to https://neon.tech
2. Sign up (free)
3. Create a project
4. Copy connection string
5. Add to `.env.local`: `DATABASE_URL=...`

---

## 2. Run Database Migrations

```bash
# Install migration tools
npm install postgres
# or use Prisma: npm install @prisma/client prisma

# Create tables using provided schema
psql $DATABASE_URL < database/schema.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

---

## 3. Update Environment Variables

Add to `.env.production`:

```
# Database
DATABASE_URL=postgresql://user:password@host:5432/repoexplainer

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Admin
ADMIN_API_KEY=your-secure-admin-key
```

---

## 4. Update API Routes with Authentication

Replace your current `/app/api/analyze/route.ts`:

```typescript
import { withAuth } from "@/lib/middleware";
import { logApiCall } from "@/lib/auth";

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, auth) => {
    const startTime = Date.now();
    const { url, level } = await req.json();

    try {
      // Your existing analysis logic
      const result = await performAnalysis(owner, repo, level);

      const duration = Date.now() - startTime;
      
      // Log to database
      if (auth.userId) {
        await logApiCall(
          auth.userId,
          "analyze",
          { owner, repo },
          level,
          cached,
          duration,
          200
        );
      }

      return NextResponse.json({
        ...result,
        "X-Quota-Remaining": auth.quota.remaining - 1,
      });

    } catch (e: any) {
      if (auth.userId) {
        await logApiCall(
          auth.userId,
          "analyze",
          { owner, repo },
          level,
          false,
          Date.now() - startTime,
          500,
          e.message
        );
      }
      throw e;
    }
  });
}
```

---

## 5. Add Authentication Endpoints

Create `/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json();

  try {
    const user = await createUser(email, name);
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
```

Create `/app/api/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, getAnalytics } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 401 });
  }

  const user = await authenticateApiKey(apiKey);
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const analytics = await getAnalytics(user.id);

  return NextResponse.json({
    user,
    analytics,
  });
}
```

---

## 6. Add Pricing Page

Create `/app/pricing/page.tsx`:

```tsx
"use client";
import { PLANS } from "@/lib/pricing";

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h1>Pricing</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <h2>{plan.name}</h2>
            <div style={{ fontSize: 32, fontWeight: "bold", margin: "1rem 0" }}>
              ${plan.price}
              <span style={{ fontSize: 14 }}>/month</span>
            </div>
            <p>{plan.apiCallsPerMonth.toLocaleString()} API calls/month</p>
            <ul style={{ textAlign: "left", marginBottom: "2rem" }}>
              {plan.features.map((f) => (
                <li key={f} style={{ margin: "0.5rem 0" }}>✓ {f}</li>
              ))}
            </ul>
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: plan.id === "free" ? "#f0f0f0" : "#1a1a1a",
                color: plan.id === "free" ? "#333" : "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {plan.id === "free" ? "Get Started" : "Start Free Trial"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Add Stripe Integration (For Payments)

```bash
npm install stripe @stripe/react-js
```

Create `/app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { planId } = await req.json();

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: PLANS[planId].stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_API_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

## 8. Dashboard Page (Analytics)

Create `/app/dashboard/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = localStorage.getItem("apiKey");
    if (!apiKey) return;

    fetch("/api/analytics", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!analytics) return <div>No data</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem" }}>
      <h1>Dashboard</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Card title="Total Calls" value={analytics.analytics.totalCalls} />
        <Card title="Cache Hit Rate" value={`${analytics.analytics.cacheHitRate}%`} />
        <Card title="Avg Response" value={`${analytics.analytics.avgResponseTime}ms`} />
        <Card title="Unique Repos" value={analytics.analytics.uniqueRepos} />
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Your API Key</h2>
        <code style={{ background: "#f0f0f0", padding: "1rem", display: "block" }}>
          {localStorage.getItem("apiKey")}
        </code>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Usage This Month</h2>
        <div style={{ fontSize: 18 }}>
          {analytics.user.apiCallsThisMonth} / {analytics.user.apiLimit} calls
        </div>
        <div style={{
          background: "#f0f0f0",
          height: 20,
          borderRadius: 10,
          overflow: "hidden",
          marginTop: "0.5rem",
        }}>
          <div style={{
            background: "#1a1a1a",
            height: "100%",
            width: `${(analytics.user.apiCallsThisMonth / analytics.user.apiLimit) * 100}%`,
            transition: "width 0.3s",
          }} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: "0.5rem" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}
```

---

## 9. Deployment Checklist

- [ ] PostgreSQL database created
- [ ] `database/schema.sql` executed
- [ ] `DATABASE_URL` set in environment
- [ ] `lib/auth.ts` connected to database
- [ ] `/api/analytics` endpoint working
- [ ] `/api/auth/register` endpoint working
- [ ] `/app/pricing` page deployed
- [ ] Stripe keys configured (optional, for Phase 3)
- [ ] Dashboard page accessible
- [ ] API keys generate and authenticate

---

## 10. Monitoring Database

```bash
# Connect to database
psql $DATABASE_URL

# View API calls
SELECT endpoint, COUNT(*) FROM api_calls GROUP BY endpoint;

# View popular repos
SELECT * FROM popular_repos ORDER BY analysis_count DESC;

# View daily stats
SELECT * FROM usage_stats ORDER BY date DESC LIMIT 7;

# View user quotas
SELECT email, api_calls_this_month, api_limit_monthly FROM users;
```

---

## Cost Estimate (Phase 2)

| Service | Free Tier | Paid Tier | Est. Cost |
|---------|-----------|-----------|-----------|
| Vercel | 100GB bandwidth | $20/mo | $20 |
| Postgres (Neon) | Free up to 1GB | $9/mo | $9 |
| Upstash Redis | 10k reqs/day | $20/mo | $20 |
| Groq API | Free (30/min) | $0.01 per call | ~$5 |
| Stripe | 2.9% + 30¢ | Same | Variable |
| **Total** | **$0** | - | **~$50-100/mo** |

---

## Next Steps

1. Set up PostgreSQL (Neon recommended)
2. Run database schema
3. Update API routes with auth middleware
4. Add authentication endpoints
5. Deploy pricing page
6. Test API key generation and usage
7. Monitor analytics

With this setup, you can support 1000+ users with per-user quotas and analytics.
