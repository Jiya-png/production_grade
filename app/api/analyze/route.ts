import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { parseGitHubUrl, fetchReadme, fetchFileTree } from "@/lib/github";
import { buildPrompt } from "@/lib/prompt";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("✅ Request body:", body);

    const { url, level } = body;

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Step 1: Parse URL
    let owner: string, repo: string;
    try {
      const parsed = parseGitHubUrl(url);
      owner = parsed.owner;
      repo = parsed.repo;
      console.log("✅ Parsed:", { owner, repo });
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    // Step 2: Fetch GitHub data
    let readme: string, fileTree: string[];
    try {
      console.log("⏳ Fetching GitHub data...");
      [readme, fileTree] = await Promise.all([
        fetchReadme(owner, repo),
        fetchFileTree(owner, repo)
      ]);
      console.log("✅ README length:", readme.length);
      console.log("✅ File count:", fileTree.length);
    } catch (e: any) {
      console.error("❌ GitHub fetch error:", e?.message);
      return NextResponse.json(
        { error: `Failed to fetch repo from GitHub: ${e?.message}` },
        { status: 500 }
      );
    }

    // Step 3: Build prompt
    const prompt = buildPrompt(readme, fileTree, level);
    console.log("✅ Prompt length:", prompt.length);

    // Step 4: Call Groq
    let text: string;
    try {
      console.log("⏳ Calling Groq...");
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });
      text = completion.choices[0]?.message?.content || "";
      console.log("✅ Groq response length:", text.length);
      console.log("✅ Groq raw (first 300):", text.slice(0, 300));
    } catch (e: any) {
      console.error("❌ Groq error:", e?.message);
      return NextResponse.json(
        { error: `Groq API failed: ${e?.message}` },
        { status: 500 }
      );
    }

    // Step 5: Parse JSON
    let parsed: any;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
      console.log("✅ JSON parsed successfully");
    } catch (e) {
      console.error("❌ JSON parse failed. Raw text:", text);
      return NextResponse.json(
        { error: "AI returned invalid JSON. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ owner, repo, ...parsed });

  } catch (e: any) {
    console.error("❌ Unexpected error:", e);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
