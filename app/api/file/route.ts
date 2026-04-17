import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchFileContent } from "@/lib/github";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Level = "beginner" | "intermediate" | "advanced";

const levelInstructions = {
  beginner: "Explain as if talking to someone new to coding. Avoid jargon. Use simple analogies.",
  intermediate: "Assume basic coding knowledge. You can mention frameworks and patterns.",
  advanced: "Be technically precise. Mention design patterns, architecture decisions, trade-offs."
};

export async function POST(req: NextRequest) {
  const { owner, repo, path, level }: { owner: string; repo: string; path: string; level: Level } = await req.json();

  const content = await fetchFileContent(owner, repo, path);

  const prompt = `
You are a senior developer explaining a single file from a GitHub repository.
Explanation style: ${levelInstructions[level]}

File path: ${path}

File content:
<file>
${content.slice(0, 3000)}
</file>

Return a JSON object with EXACTLY this shape:
{
  "purpose": "One sentence: what is this file's job in the project?",
  "whatItDoes": ["bullet 1", "bullet 2", "bullet 3"],
  "keyFunctions": [
    { "name": "functionName", "description": "what it does" }
  ],
  "dependsOn": ["list of imports or files this depends on"],
  "tip": "One insight a beginner would miss"
}

Only return valid JSON. No markdown, no extra text, no backticks.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const text = completion.choices[0]?.message?.content || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("❌ Groq file explain error:", e?.message);
    return NextResponse.json({ error: "Failed to explain file" }, { status: 500 });
  }
}