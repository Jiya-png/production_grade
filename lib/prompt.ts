type Level = "beginner" | "intermediate" | "advanced";

const levelInstructions = {
  beginner: "Explain as if talking to someone new to coding. Avoid jargon. Use simple analogies.",
  intermediate: "Assume basic coding knowledge. You can mention frameworks and patterns.",
  advanced: "Be technically precise. Mention design patterns, architecture decisions, trade-offs."
};

export function buildPrompt(readme: string, fileTree: string[], level: Level) {
  return `
You are a senior developer explaining a GitHub repository to someone.
Explanation style: ${levelInstructions[level]}

Here is the README:
<readme>
${readme.slice(0, 3000)}
</readme>

Here is the file/folder structure:
<file_tree>
${fileTree.join("\n")}
</file_tree>

Return a JSON object with EXACTLY this shape:
{
  "summary": "2-3 sentence plain-English description of what this project does",
  "techStack": ["list", "of", "technologies", "detected"],
  "howToRun": ["step 1", "step 2", "step 3"],
  "fileExplanations": [
    { "path": "src/index.js", "explanation": "what this file does" }
  ],
  "keyInsight": "One sentence on the most interesting architectural decision"
}

Only return valid JSON. No markdown, no extra text.
`;
}