export type Level = "beginner" | "intermediate" | "advanced";

export interface FileExplanation {
  path: string;
  explanation: string;
}

export interface AnalyzeResult {
  owner: string;
  repo: string;
  summary: string;
  techStack: string[];
  howToRun: string[];
  fileExplanations: FileExplanation[];
  keyInsight: string;
}

export interface FileDetail {
  purpose: string;
  whatItDoes: string[];
  keyFunctions: { name: string; description: string }[];
  dependsOn: string[];
  tip: string;
}