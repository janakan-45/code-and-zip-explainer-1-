export interface CodeFile {
  path: string;
  name: string;
  content: string;
  size: number;
}

export interface WorkflowStep {
  title: string;
  description: string;
  file: string;
  lineRange: string;
  type: "input" | "condition" | "operation" | "error" | "output" | "network" | "render";
  highlightedCode: string;
}

export interface ExplainerState {
  isAnalyzing: boolean;
  explanation: string;
  workflowSteps?: WorkflowStep[];
  error: string | null;
}

export interface Language {
  code: string;       // BCP-47 voice language code (e.g., 'ta-IN', 'hi-IN')
  name: string;       // English name (e.g., 'Tamil', 'Hindi', 'Spanish')
  nativeName: string; // Native language name (e.g., 'தமிழ்', 'हिन्दी', 'Español')
  flag: string;       // Flag emoji (e.g., '🇮🇳', '🇪🇸')
}
