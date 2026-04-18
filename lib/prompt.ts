type Level = "beginner" | "intermediate" | "advanced";

const levelInstructions = {
  beginner: "Explain as if talking to someone new to coding. Avoid jargon. Use simple analogies.",
  intermediate: "Assume basic coding knowledge. You can mention frameworks and patterns.",
  advanced: "Be technically precise. Mention design patterns, architecture decisions, trade-offs."
};

export function buildPrompt(readme: string, fileTree: string[], level: Level) {
  const trimmedReadme = readme.slice(0, 2000);
  const importantFiles = fileTree
    .filter(f => 
      !f.includes("test") && 
      !f.includes("__pycache__") && 
      !f.endsWith(".png") && 
      !f.endsWith(".jpg") && 
      !f.endsWith(".svg") && 
      !f.endsWith(".ico") && 
      !f.includes("package-lock") && 
      !f.endsWith(".min.js")
    )
    .slice(0, 40);

  return `You are a senior developer explaining a GitHub repository.
Explanation style: ${levelInstructions[level]}

README (trimmed):
<readme>${trimmedReadme}</readme>

File structure (key files only):
<file_tree>${importantFiles.join("\n")}</file_tree>

Return a JSON object with EXACTLY this shape and nothing else:
{
  "summary": "2-3 sentence plain-English description",
  "techStack": ["list", "of", "technologies"],
  "howToRun": ["step 1", "step 2", "step 3"],
  "fileExplanations": [{ "path": "filename", "explanation": "one sentence" }],
  "keyInsight": "One sentence on most interesting architectural decision"
}

Rules: Only valid JSON, no markdown, no backticks, no extra text, fileExplanations max 15 files.`;
}