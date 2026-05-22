/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { CodeFile, ExplainerState, Language } from "./types";
import { LANGUAGES } from "./data/languages";
import { LanguageSelector } from "./components/LanguageSelector";
import { VoiceNarrator } from "./components/VoiceNarrator";
import { FileTree } from "./components/FileTree";
import { CodeViewer } from "./components/CodeViewer";
import Markdown from "react-markdown";
import {
  Upload,
  X,
  Sparkles,
  RefreshCw,
  Zap,
  HelpCircle,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Code2,
  ListRestart
} from "lucide-react";

export default function App() {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(LANGUAGES[0]); // Default to English
  const [mode, setMode] = useState<"simple" | "developer" | "analyst">("simple");
  const [state, setState] = useState<ExplainerState>({
    isAnalyzing: false,
    explanation: "",
    error: null,
  });

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter selected file to display
  const activeFile = files.find((f) => f.path === selectedPath) || null;

  // Load a demonstration codebase so users can test the tool immediately without a ZIP file
  const loadDemoCodebase = () => {
    const demoFiles: CodeFile[] = [
      {
        path: "src/calculator.ts",
        name: "calculator.ts",
        size: 1450,
        content: `/**
 * Simple calculation engine with standard formula evaluations
 * Supports core math operations and security boundary limit checks.
 */

export class CalculationEngine {
  private basePrecision = 2;

  constructor(precision?: number) {
    if (precision !== undefined) {
      this.basePrecision = precision;
    }
  }

  // Safely evaluates base arithmetic with boundary protection
  public evaluate(operation: "add" | "subtract" | "multiply" | "divide", a: number, b: number): number {
    if (Math.abs(a) > 999999 || Math.abs(b) > 999999) {
      throw new Error("Calculation inputs exceed allowable resource thresholds.");
    }

    switch (operation) {
      case "add":
        return parseFloat((a + b).toFixed(this.basePrecision));
      case "subtract":
        return parseFloat((a - b).toFixed(this.basePrecision));
      case "multiply":
        return parseFloat((a * b).toFixed(this.basePrecision));
      case "divide":
        if (b === 0) {
          throw new Error("Mathematical anomaly. Cannot divide by integer zero.");
        }
        return parseFloat((a / b).toFixed(this.basePrecision));
      default:
        throw new Error("Calculations operator is not recognized.");
    }
  }
}`
      },
      {
        path: "src/main.ts",
        name: "main.ts",
        size: 850,
        content: `import { CalculationEngine } from "./calculator";

function runDashboardDemo() {
  console.log("Setting up local dashboard system...");
  
  try {
    const engine = new CalculationEngine(4);
    
    const sum = engine.evaluate("add", 12.345, 67.89);
    console.log(\`Calculated sum validation: \${sum}\`); // 80.235
    
    // Division run
    const quotient = engine.evaluate("divide", 100, 3);
    console.log(\`Calculated quotient: \${quotient}\`); // 33.3333
    
    // Trigger error boundary (overflow)
    console.log("Testing safety threshold limits...");
    engine.evaluate("multiply", 99999999, 2);
    
  } catch (error: any) {
    console.warn("Safety boundary triggered successfully:", error.message);
  }
}

runDashboardDemo();`
      },
      {
        path: "README.md",
        name: "README.md",
        size: 420,
        content: `# Code Tutor Calculator Demonstration

This repository contains a simple, typesafe precision calculation utility.
It validates input bounds and blocks overflow operations to keep your runtime container thread-safe.

## Features Included
- Precision decimal configurations
- Custom safety exception boundaries
- Self-recovering dashboard validation scripts`
      }
    ];

    setFiles(demoFiles);
    setSelectedPath("src/calculator.ts");
    setState({
      isAnalyzing: false,
      explanation: "",
      error: null,
    });
  };

  // Extract raw files out of ZIP archives client-side using JSZip
  const processZipFile = async (zipBlob: File) => {
    setState({ isAnalyzing: true, explanation: "", error: null });
    try {
      const zip = await JSZip.loadAsync(zipBlob);
      const extractedList: CodeFile[] = [];
      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, entry) => {
        // Only extract file entries (skip folders as distinct objects)
        if (!entry.dir) {
          const promise = entry.async("string").then((rawContent) => {
            const fileName = relativePath.split("/").pop() || entry.name;
            
            // Check for binary elements or metadata to filter readable lines
            const isBinary = /[\x00-\x08\x0E-\x1F\x80-\xFF]/.test(rawContent.substring(0, 400));
            const isUseless = 
              relativePath.startsWith("__MACOSX/") || 
              relativePath.includes(".DS_Store") || 
              relativePath.includes(".git/") ||
              relativePath.includes("node_modules/");

            if (!isBinary && !isUseless) {
              extractedList.push({
                path: relativePath,
                name: fileName,
                content: rawContent,
                size: (entry as any)._data.uncompressedSize || rawContent.length,
              });
            }
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      if (extractedList.length === 0) {
        throw new Error("No readable text/code files found in this ZIP archive.");
      }

      // Sort files alphabetical by path
      extractedList.sort((a, b) => a.path.localeCompare(b.path));

      setFiles(extractedList);
      // Select the first extracted file
      setSelectedPath(extractedList[0].path);
      setState({
        isAnalyzing: false,
        explanation: "",
        error: null,
      });
    } catch (err: any) {
      console.error("ZIP Unpack Failed:", err);
      setState({
        isAnalyzing: false,
        explanation: "",
        error: err.message || "Failed to process target archive. Ensure it is a valid, uncorrupted ZIP.",
      });
    }
  };

  // Handle single code text file uploads direct
  const processTextFiles = (uploadedFiles: FileList) => {
    setState({ isAnalyzing: true, explanation: "", error: null });
    const readerPromises: Promise<CodeFile>[] = [];

    Array.from(uploadedFiles).forEach((file) => {
      const promise = new Promise<CodeFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve({
            path: file.name,
            name: file.name,
            content: text,
            size: file.size,
          });
        };
        reader.onerror = () => reject(new Error(`Failed to load file ${file.name}`));
        reader.readAsText(file);
      });
      readerPromises.push(promise);
    });

    Promise.all(readerPromises)
      .then((extracted) => {
        setFiles(extracted);
        setSelectedPath(extracted[0].path);
        setState({ isAnalyzing: false, explanation: "", error: null });
      })
      .catch((err: any) => {
        setState({
          isAnalyzing: false,
          explanation: "",
          error: err.message || "Failed to parse selected source files.",
        });
      });
  };

  // File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const firstFile = e.dataTransfer.files[0];
      if (firstFile.name.endsWith(".zip")) {
        processZipFile(firstFile);
      } else {
        processTextFiles(e.dataTransfer.files);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesList = e.target.files;
      const primaryFile = filesList[0];
      if (primaryFile.name.endsWith(".zip") && filesList.length === 1) {
        processZipFile(primaryFile);
      } else {
        processTextFiles(filesList);
      }
    }
  };

  const handleTriggerExplorer = () => {
    fileInputRef.current?.click();
  };

  // Perform full explanation call to server-side Gemini tutor
  const triggerExplainSource = async (pathOverride?: string | null) => {
    const targetPath = pathOverride !== undefined ? pathOverride : selectedPath;
    
    setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const payload = {
        files: files.map((f) => ({ path: f.path, content: f.content })),
        selectedPath: targetPath,
        language: targetLanguage.name,
        mode,
      };

      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to calculate technical breakdown.");
      }

      setState({
        isAnalyzing: false,
        explanation: data.explanation,
        error: null,
      });

      // Smooth scroll explaining panel into view on mobile viewport
      setTimeout(() => {
        const viewerEl = document.getElementById("explanation-anchor");
        if (viewerEl) {
          viewerEl.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);

    } catch (err: any) {
      console.error(err);
      setState({
        isAnalyzing: false,
        explanation: "",
        error: err.message || "Server error analyzing current repository code.",
      });
    }
  };

  const clearWorkspace = () => {
    setFiles([]);
    setSelectedPath(null);
    setState({
      isAnalyzing: false,
      explanation: "",
      error: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Premium minimal header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 py-4 px-6 shrink-0 shadow-sm/5 bg-opacity-95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-xl/10 shrink-0">
              <Code2 className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 id="app-heading" className="text-base font-bold tracking-tight text-slate-900">
                Code & ZIP Explainer
              </h1>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">
                Translate complex systems into clear concepts with global voice support
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {files.length > 0 && (
              <button
                id="btn-reset"
                onClick={clearWorkspace}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Workspace</span>
              </button>
            )}

            <button
              id="btn-demo"
              onClick={loadDemoCodebase}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Demo Project</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Upload Hub Dropzone (show only if files array is empty) */}
        {files.length === 0 ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full max-w-2xl mx-auto bg-white border-2 border-dashed rounded-3xl p-10 text-center transition shadow-sm ${
              dragActive
                ? "border-slate-900 bg-slate-50/50 scale-[1.01]"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              multiple
              accept=".zip, .js, .jsx, .ts, .tsx, .py, .java, .cpp, .h, .json, .md, .html, .css"
              className="hidden"
            />

            <div className="mx-auto w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>

            <h2 className="text-base font-bold text-slate-800">
              Upload your ZIP code archive
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5">
              Drag and drop any ZIP archive containing project folders, or select multiple single code files directly.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-browse-workspace"
                onClick={handleTriggerExplorer}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
              >
                Browse Files
              </button>
              <span className="text-slate-400 font-semibold text-xs py-1">or</span>
              <button
                id="btn-quick-demo-start"
                onClick={loadDemoCodebase}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Try sample code
              </button>
            </div>

            {state.error && (
              <div className="mt-6 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 max-w-md mx-auto flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-left font-medium">{state.error}</span>
              </div>
            )}
          </div>
        ) : (
          /* Main Functional Split Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Controls & Navigation Files (Grid size 4) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Settings Controller pane */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <GraduationCap className="w-4 h-4 text-slate-700" />
                  <h3 id="panel-settings-title" className="text-xs font-bold text-slate-900">
                    Explanation Customization
                  </h3>
                </div>

                {/* Target Language Dropdown Selector */}
                <LanguageSelector selectedLanguage={targetLanguage} onLanguageChange={setTargetLanguage} />

                {/* Explanation Depth Level select buttons */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Breakdown Style Format
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-550 border border-slate-200 p-1 rounded-xl">
                    {(["simple", "developer", "analyst"] as const).map((modeValue) => (
                      <button
                        key={modeValue}
                        onClick={() => setMode(modeValue)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold tracking-tight capitalize transition cursor-pointer ${
                          mode === modeValue
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {modeValue === "simple"
                          ? "Simple Metaphor"
                          : modeValue === "developer"
                          ? "Flow mechanics"
                          : "Audit Check"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 pb-1">
                    {mode === "simple" && "💡 Focuses on real-world analogies and summaries for anyone."}
                    {mode === "developer" && "🔧 Deconstructs logical flow pathways, loops, types, and architecture."}
                    {mode === "analyst" && "🛡️ Explores performance, security vulnerabilities, bounds, and clean code."}
                  </p>
                </div>

                {/* Submit Trigger Explaining workspace button */}
                <button
                  id="btn-trigger-ai"
                  onClick={() => triggerExplainSource()}
                  disabled={state.isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-100 disabled:text-slate-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md disabled:shadow-none cursor-pointer"
                >
                  {state.isAnalyzing ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      <span>Synthesizing explanation...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {selectedPath ? "Explain Selected File" : "Explain Full Project"}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Recursive file Tree directory component */}
              <FileTree
                files={files}
                selectedPath={selectedPath}
                onSelectPath={setSelectedPath}
                onExplainRequested={(path) => {
                  setSelectedPath(path);
                  // Allow microtalk transition
                  setTimeout(() => {
                    triggerExplainSource(path);
                  }, 50);
                }}
              />
            </div>

            {/* RIGHT COLUMN: Code View Window & Output Breakdown (Grid size 8) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Code viewer viewport */}
              <CodeViewer
                file={activeFile}
                isAnalyzing={state.isAnalyzing}
                onExplainRequested={() => triggerExplainSource()}
              />

              {/* Explanation Outcome Section */}
              <div id="explanation-anchor" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 scroll-mt-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 id="outcome-heading" className="text-sm font-bold text-slate-950">
                        Humanized Translation & Guide
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {selectedPath ? `Breakdown for file: ${selectedPath}` : "Breakdown for entire project archive"}
                      </p>
                    </div>
                  </div>

                  {/* Visual Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    {state.isAnalyzing ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-100">
                        <LoaderIcon className="w-3 h-3 animate-spin text-amber-600" />
                        Generating
                      </span>
                    ) : state.explanation ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-100">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Ready in {targetLanguage.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">No calculation active</span>
                    )}
                  </div>
                </div>

                {state.error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-slate-800 text-xs text-left animate-in fade-in duration-300">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-800">Explanation process halted</div>
                      <p className="text-rose-700/80 mt-1">{state.error}</p>
                    </div>
                  </div>
                )}

                {/* Narrative Sound Reader voice component block */}
                {state.explanation && (
                  <div className="animate-in fade-in duration-300">
                    <VoiceNarrator text={state.explanation} language={targetLanguage} />
                  </div>
                )}

                {/* Explanation Content Box */}
                <div className="min-h-[160px] bg-slate-50/40 rounded-2xl p-5 border border-slate-100 relative">
                  {state.isAnalyzing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-xs rounded-2xl transition">
                      <LoaderIcon className="w-8 h-8 text-slate-800 animate-spin" />
                      <p className="text-xs text-slate-500 mt-4 font-bold tracking-tight">
                        Connecting to Gemini API server...
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-xs text-center mt-1">
                        We are reading code layers and writing an easy-to-understand translation in {targetLanguage.flag} {targetLanguage.name}.
                      </p>
                    </div>
                  ) : null}

                  {state.explanation ? (
                    <div className="markdown-body transition select-text">
                      <Markdown>{state.explanation}</Markdown>
                    </div>
                  ) : !state.isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                      <div className="p-3 bg-white border border-slate-50 rounded-2xl shadow-sm/5 text-slate-300 mb-2">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">No active explanation generated</p>
                      <p className="text-[10px] text-slate-400 mt-1 px-4 max-w-sm">
                        Select a specific file or the full workspace above, configure your language settings, and press **Explain** to trigger artificial intelligence tutoring.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-12 py-6 bg-white shrink-0 text-center">
        <p className="text-[10px] font-semibold text-slate-400">
          Powered by Gemini 3.5 Flash & Client-Side ZIP Processing • AI Studio Applet
        </p>
      </footer>
    </div>
  );
}

// Minimal inline loader SVG icon to avoid adding unused heavy deps
function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
