import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up server-side JSON body sizing
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini API client lazily to avoid crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API endpoint: Explains code using Gemini 3.5 Flash
app.post("/api/explain", async (req, res) => {
  try {
    const { files, selectedPath, language, mode } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No files provided for analysis." });
      return;
    }

    const ai = getGeminiClient();

    // Context formatting: list files and their content
    let contextPrompt = "";
    if (selectedPath) {
      // Explaining a single file
      const currentFile = files.find((f) => f.path === selectedPath);
      if (!currentFile) {
        res.status(404).json({ error: `Selected file ${selectedPath} not found.` });
        return;
      }
      contextPrompt = `You are explaining a single file inside a project archive.
File Path: ${currentFile.path}
File Material:
\`\`\`
${currentFile.content}
\`\`\``;
    } else {
      // Explaining the entire project
      contextPrompt = `You are explaining an entire project archive containing multiple files. Your primary objective is to analyze the data and logic flow patterns across files, explain how they import/call each other, detail the core architecture, and construct an intuitive flow. Here is the file structure and contents:
${files
  .map(
    (f) => `--- File: ${f.path} ---
${f.content.substring(0, 10000)} ${f.content.length > 10000 ? "\n[CONTENT TRUNCATED FOR SIZE...]" : ""}`
  )
  .join("\n\n")}`;
    }

    const languageInstruction = `CRITICAL: You MUST write your ENTIRE explanation (including titles and descriptions in workflowSteps) in the "${language || "English"}" language. This includes headings, paragraphs, and list items. Keep code blocks as actual code, but explain them strictly in ${language || "English"}.`;

    const systemInstruction = `You are an elite, empathetic software tutor and technical communicator.
Your goal is to explain code to humans in a highly intuitive, incredibly clear, and rewarding format.

You MUST respond strictly with a JSON object containing exactly two keys:
1. "explanation": A string containing your highly refined markdown text explanation of the code.
2. "workflowSteps": An array of objects representing a step-by-step visual execution workflow or flowchart of the code. Each step object MUST contain:
   - "title": A short title for the step.
   - "description": A simple, clear sentence explaining what happens.
   - "file": The file path associated with this step.
   - "lineRange": The approximate line range (e.g. "80-83") in the file.
   - "type": One of: "input" | "condition" | "operation" | "error" | "output" | "network" | "render"
   - "highlightedCode": The specific lines of code associated with this step.

When explaining a SINGLE file, structure the "explanation" markdown like this:
1. **🚀 Overall Purpose**: An intuitive metaphor/analogy and simple summary of what the file does.
2. **🧩 How it Works (Step-by-Step)**: A logical break-down of the processes, algorithms, or execution flow inside this file.
3. **💡 Core Highlights & Functions**: Identify specific important functions, classes, or patterns and why they matter.
4. **⚠️ Potential Caveats or Suggestions**: Points that might fail, performance notes, or constructive improvement tips.

When explaining the ENTIRE project archive (selectedPath is empty or null):
Ensure you focus heavily on the data and logical execution flow across the files. Structure the "explanation" markdown like this:
1. **🚀 Archive Architecture Summary**: An intuitive macro analogy/metaphor describing what the overall system does.
2. **📂 Key Component Map**: Briefly list the extracted files and explain their unique role in the machine.
3. **🔄 Logical Execution Flow**: Explain step-by-step how the system boots or runs. How does data move from the entry point to other helper modules? Where do inputs go, and how do functions link / call each other?
4. **🗺️ Interactive Data Flow Diagram**: Construct a visual text-based/Unicode flow map (ASCII diagrams using arrows like -->, [Module], etc.) illustrating the interaction hierarchy.
5. **💡 Core highlights & Future upgrades**: Key highlights or suggestions for improving this codebase.

Keep your tone welcoming, warm, and easy to understand (yet professionally technical where helpful).
${languageInstruction}
Mode selected: "${mode || "simple"}" (Format depth adjustment:
  - "simple": Focus heavily on metaphors, basic concepts, high-level summaries, and easy definitions.
  - "developer": Balance high-level architecture with deep-dives into code execution paths and coding patterns.
  - "analyst": Focus on performance, optimization opportunities, clean-code practices, structure, and security considerations.
)`;

    const userPrompt = `${contextPrompt}

Please provide your highly refined, empathetic explanation and step-by-step workflow steps for this code in ${language || "English"}. Return strictly in the requested JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      res.status(500).json({ error: "Received empty response from Gemini API." });
      return;
    }

    try {
      let cleanedText = response.text.trim();
      
      // Try to extract JSON object from text using regex in case it is wrapped in markdown code blocks
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedText);
      res.json({
        explanation: parsed.explanation || response.text,
        workflowSteps: parsed.workflowSteps || []
      });
    } catch (parseErr) {
      console.warn("Failed to parse Gemini response as JSON. Falling back to raw response text.", parseErr);
      res.json({
        explanation: response.text,
        workflowSteps: []
      });
    }
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred on the server." });
  }
});

// REST API endpoint: AI Tutor Chat Q&A
app.post("/api/chat", async (req, res) => {
  try {
    const { files, selectedPath, messages, language } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No files provided for context." });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "No message history provided." });
      return;
    }

    const ai = getGeminiClient();

    // Format current files context
    let contextPrompt = "";
    if (selectedPath) {
      const currentFile = files.find((f) => f.path === selectedPath);
      if (currentFile) {
        contextPrompt = `You are a helpful software tutor answering questions about this specific file:
File Path: ${currentFile.path}
File Content:
\`\`\`
${currentFile.content}
\`\`\``;
      }
    } else {
      contextPrompt = `You are a helpful software tutor answering questions about this entire project:
${files
  .map(
    (f) => `--- File: ${f.path} ---
${f.content.substring(0, 8000)}`
  )
  .join("\n\n")}`;
    }

    const systemInstruction = `${contextPrompt}
    
CRITICAL: You MUST write your response in the "${language || "English"}" language. Keep your tone supportive, clear, warm, and highly tutorial.
Explain things simply but with technical depth where useful. Use clean Markdown elements.`;

    // Map conversation history to content objects for Google Gen AI SDK
    const contents = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    if (!response.text) {
      res.status(500).json({ error: "Received empty response from Gemini API." });
      return;
    }

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini Chat API call failed:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during chat." });
  }
});

// REST API endpoint: AI Code Refactoring
app.post("/api/refactor", async (req, res) => {
  try {
    const { file, prompt } = req.body;

    if (!file || !file.content) {
      res.status(400).json({ error: "No file provided for refactoring." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an elite software refactoring agent.
Your ONLY task is to refactor the provided code block according to the instructions.
CRITICAL: You MUST ONLY return the refactored code. Do NOT wrap it in markdown code blocks like \`\`\`ts or \`\`\`. Do NOT include introductory text, explanations, or trailing commentary. Return only the raw code lines.

Refactoring Request instruction: "${prompt}"`;

    const userPrompt = `Here is the current code of the file "${file.path}":
\`\`\`
${file.content}
\`\`\``;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    let refactoredCode = response.text || "";
    // Sanitize any accidental markdown code fences
    if (refactoredCode.trim().startsWith("```")) {
      const lines = refactoredCode.split("\n");
      if (lines[0].trim().startsWith("```")) {
        lines.shift();
      }
      if (lines[lines.length - 1].trim().startsWith("```")) {
        lines.pop();
      }
      refactoredCode = lines.join("\n");
    }

    res.json({ refactoredCode });
  } catch (error: any) {
    console.error("Gemini Refactor API call failed:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during refactoring." });
  }
});

// Setup Vite development or production static files serving
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR disabled proxying...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static directory...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded and ready. Ingress listening on http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
