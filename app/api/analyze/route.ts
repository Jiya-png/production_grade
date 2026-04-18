import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { cacheGet, cacheSet } from "@/lib/cache"
import { checkRateLimit } from "@/lib/ratelimit"
import { queueAnalysis } from "@/lib/queue"

export async function POST(req: NextRequest) {
  // ═══════════════════════════════════════════════════════
  // STEP 1: RECEIVE THE REQUEST
  // ═══════════════════════════════════════════════════════
  
  const startTime = Date.now()  // Record when this started
  
  // Get the data the user sent
  const body = await req.json()
  const url = body.url  // "https://github.com/expressjs/express"
  const level = body.level  // "beginner"
  
  // Parse the URL to extract owner and repo name
  // From: "https://github.com/expressjs/express"
  // Extract: owner = "expressjs", repo = "express"
  const { owner, repo } = parseGitHubUrl(url)
  
  console.log(`Analyzing ${owner}/${repo} for ${level} level`)

  // ═══════════════════════════════════════════════════════
  // STEP 2: CHECK RATE LIMIT
  // ═══════════════════════════════════════════════════════
  
  // Get user's IP address
  const userIP = req.headers.get("x-forwarded-for") || "unknown"
  
  // Ask the rate limiter: "Can this IP make a request?"
  const rateLimitCheck = await checkRateLimit(userIP)
  
  if (!rateLimitCheck.success) {
    // Too many requests from this IP
    return NextResponse.json(
      { 
        error: "Too many requests. Please wait before trying again.",
        retryAfter: rateLimitCheck.retryAfter  // "Try again in 30 seconds"
      },
      { status: 429 }  // 429 = "Too Many Requests"
    )
  }

  // ═══════════════════════════════════════════════════════
  // STEP 3: CHECK CACHE
  // ═══════════════════════════════════════════════════════
  
  // Create a key to remember this specific request
  const cacheKey = `repo:${owner}:${repo}:${level}`
  // Example: "repo:expressjs:express:beginner"
  
  // Ask the cache: "Do we have this answer already?"
  const cachedResult = await cacheGet(cacheKey)
  
  if (cachedResult) {
    // YES! We have it saved! Return immediately
    console.log(`Cache hit! Returning cached result for ${cacheKey}`)
    return NextResponse.json({
      ...cachedResult,
      _cached: true,  // Tell the frontend this came from cache
      _responseTime: Date.now() - startTime
    })
  }

  // ═══════════════════════════════════════════════════════
  // STEP 4: FETCH DATA FROM GITHUB
  // ═══════════════════════════════════════════════════════
  
  console.log(`Cache miss. Fetching from GitHub...`)
  
  // Download the README file
  const readme = await fetchReadme(owner, repo)
  // Example: "Express is a web framework for Node.js..."
  
  // Get the list of all files and folders
  const fileTree = await fetchFileTree(owner, repo)
  // Example: ["src/index.js", "src/utils.js", "package.json", ...]

  // ═══════════════════════════════════════════════════════
  // STEP 5: BUILD THE PROMPT FOR THE AI
  // ═══════════════════════════════════════════════════════
  
  const prompt = buildPrompt(readme, fileTree, level)
  // This creates instructions for the AI based on skill level
  
  // If level is "beginner":
  // Prompt says: "Explain this VERY SIMPLY. Use EASY words."
  // If level is "advanced":
  // Prompt says: "Explain TECHNICALLY. Mention design patterns."

  // ═══════════════════════════════════════════════════════
  // STEP 6: ADD TO QUEUE AND CALL AI
  // ═══════════════════════════════════════════════════════
  
  console.log(`Adding to queue...`)
  
  // Add to queue (waits if 2+ requests are already running)
  const result = await queueAnalysis(async () => {
    // Call the Groq AI API
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",  // The AI model we use
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,  // Lower = more consistent answers
      max_tokens: 2000  // Max length of response
    })
    
    // Extract the text from the AI response
    const text = completion.choices[0].message.content
    
    // AI returns JSON, clean it up
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    
    return parsed
  })

  // ═══════════════════════════════════════════════════════
  // STEP 7: SAVE TO CACHE
  // ═══════════════════════════════════════════════════════
  
  console.log(`Saving to cache...`)
  
  // Save the result for 24 hours
  await cacheSet(cacheKey, result, 86400)  // 86400 seconds = 24 hours

  // ═══════════════════════════════════════════════════════
  // STEP 8: RETURN RESPONSE TO USER
  // ═══════════════════════════════════════════════════════
  
  const duration = Date.now() - startTime
  
  return NextResponse.json({
    owner,
    repo,
    level,
    ...result,
    _cached: false,  // This is fresh data, not from cache
    _responseTime: duration
  })
}