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

    const languageInstruction = `CRITICAL: You MUST write your ENTIRE explanation in the "${language || "English"}" language. This includes headings, paragraphs, and list items. Keep code blocks as actual code, but explain them strictly in ${language || "English"}.`;

    const systemInstruction = `You are an elite, empathetic software tutor and technical communicator.
Your goal is to explain code to humans in a highly intuitive, incredibly clear, and rewarding format.

When explaining a SINGLE file, structure it like this:
1. **🚀 Overall Purpose**: An intuitive metaphor/analogy and simple summary of what the file does.
2. **🧩 How it Works (Step-by-Step)**: A logical break-down of the processes, algorithms, or execution flow inside this file.
3. **💡 Core Highlights & Functions**: Identify specific important functions, classes, or patterns and why they matter.
4. **⚠️ Potential Caveats or Suggestions**: Points that might fail, performance notes, or constructive improvement tips.

When explaining the ENTIRE project archive (selectedPath is empty or null):
Ensure you focus heavily on the data and logical execution flow across the files. Structure it like this:
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

Please provide your highly refined, empathetic explanation for this code in ${language || "English"}. Highlight code segments or file links where relevant. Use rich Markdown elements (bold text, bullet points, blockquotes, code fences) to make the text beautifully legible. Keep paragraphs relatively small and scannable so it is easy to read.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.25,
      },
    });

    if (!response.text) {
      res.status(500).json({ error: "Received empty response from Gemini API." });
      return;
    }

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred on the server." });
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
