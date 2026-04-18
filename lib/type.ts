export type Level = "beginner" | "intermediate" | "advanced";

export interface FileExplanation {
  path: string;
  explanation: string;
}

export interface AnalyzeResult {
  owner: string;
  repo: string;
  level?: string;
  summary: string;
  techStack: string[];
  howToRun: string[];
  fileExplanations: FileExplanation[];
  keyInsight: string;
  _cached?: boolean;
  _responseTime?: number;
  _timestamp?: number;
}

export interface FileDetail {
  purpose: string;
  whatItDoes: string[];
  keyFunctions: Array<{
    name: string;
    description: string;
  }>;
  dependsOn: string[];
  tip: string;
  error?: string;
}