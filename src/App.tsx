/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { CodeFile, ExplainerState, Language } from "./types";
import { LANGUAGES } from "./data/languages";
import { LanguageSelector } from "./components/LanguageSelector";
import { VoiceNarrator } from "./components/VoiceNarrator";
import { FileTree } from "./components/FileTree";
import { CodeViewer } from "./components/CodeViewer";
import { TutorChat } from "./components/TutorChat";
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
  ListRestart,
  Download,
  MessageSquare,
  Wand2,
  Volume2,
  Terminal,
  ArrowRight,
  Play,
  Pause,
  Database,
  Layers,
  Cpu,
  History
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

  // Advanced components state orchestration
  const [activeTab, setActiveTab] = useState<"explanation" | "tutor_chat">("explanation");
  const [refactoredContent, setRefactoredContent] = useState<string | null>(null);
  const [isRefactoring, setIsRefactoring] = useState(false);

  // Premium landing page interactive features state
  const [playgroundStep, setPlaygroundStep] = useState<number>(0);
  const [playgroundPlaying, setPlaygroundPlaying] = useState<boolean>(true);
  const [selectedShowcaseLang, setSelectedShowcaseLang] = useState<string>("typescript");

  useEffect(() => {
    if (!playgroundPlaying) return;
    const interval = setInterval(() => {
      setPlaygroundStep((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, [playgroundPlaying]);


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
    setRefactoredContent(null);
    setActiveTab("explanation");
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
      setRefactoredContent(null);
      setActiveTab("explanation");
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
        setRefactoredContent(null);
        setActiveTab("explanation");
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
    
    // Switch to explanation tab when starting a new explanation
    setActiveTab("explanation");
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

  // Refactoring orchestration
  const handleTriggerRefactor = async (prompt: string) => {
    if (!activeFile) return;
    setIsRefactoring(true);
    setRefactoredContent(null);
    setState((prev) => ({ ...prev, error: null }));

    try {
      const response = await fetch("/api/refactor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: { path: activeFile.path, content: activeFile.content },
          prompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to refactor file.");
      }

      setRefactoredContent(data.refactoredCode);
    } catch (err: any) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        error: err.message || "Failed to trigger refactoring.",
      }));
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleRefactorApplied = (newCode: string) => {
    if (!selectedPath) return;
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.path === selectedPath ? { ...f, content: newCode, size: newCode.length } : f))
    );
    setRefactoredContent(null);
  };

  // Zip Export
  const exportUpdatedZip = async () => {
    try {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `refactored-project.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("ZIP packaging failed:", err);
      alert("Failed to export updated project ZIP archive.");
    }
  };

  const clearWorkspace = () => {
    setFiles([]);
    setSelectedPath(null);
    setRefactoredContent(null);
    setActiveTab("explanation");
    setState({
      isAnalyzing: false,
      explanation: "",
      error: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col">
      {/* Premium minimal header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 py-4 px-6 shrink-0 shadow-sm bg-opacity-95 backdrop-blur-md">
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
                Translate complex systems into clear concepts with global voice support & visual refactoring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {files.length > 0 && (
              <>
                <button
                  id="btn-export"
                  onClick={exportUpdatedZip}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-455 text-slate-955 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Updated ZIP</span>
                </button>
                <button
                  id="btn-reset"
                  onClick={clearWorkspace}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-655 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
        {/* Upload Hub Dropzone (show only if files array is empty) */}
        {files.length === 0 ? (
          <div className="max-w-6xl mx-auto space-y-16 py-6 animate-in fade-in duration-500 relative">
            {/* Glowing mesh background elements */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-250/25 to-teal-100/10 rounded-full blur-3xl opacity-30 pointer-events-none animate-glow-pulse-1 -z-10" />
            <div className="absolute top-60 -right-40 w-96 h-96 bg-gradient-to-bl from-indigo-250/25 to-purple-100/10 rounded-full blur-3xl opacity-30 pointer-events-none animate-glow-pulse-2 -z-10" />
            <div className="absolute inset-0 bg-grid-glow opacity-50 pointer-events-none -z-10" />

            {/* Hero Header Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-full text-emerald-800 text-[10px] font-extrabold tracking-wider uppercase select-none shadow-2xs">
                <Sparkles className="w-3 h-3 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Premium AI Developer Sandbox</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Deconstruct, Refactor & Explain <br />
                <span className="bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-655 bg-clip-text text-transparent animate-gradient-move">
                  Any Codebase Instantly
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed font-semibold">
                Upload a ZIP archive or drop single code files. Our advanced client-side processing extracts structure instantly, generating interactive explanations, before/after code refactoring reviews, and voice tutoring.
              </p>
            </div>

            {/* Dual Grid Layout: Left Upload Hub & Right Interactive Code Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
              
              {/* LEFT COLUMN: Frosted Dropzone Box */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full h-full bg-white/70 backdrop-blur-md border rounded-3xl p-8 text-center transition-all duration-300 relative overflow-hidden group shadow-md flex flex-col justify-center items-center ${
                    dragActive
                      ? "border-emerald-500 bg-slate-50/50 scale-[1.01] ring-4 ring-emerald-100"
                      : "border-slate-200 hover:border-slate-350 hover:shadow-lg"
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

                  <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-6 shadow-xs group-hover:scale-105 group-hover:bg-white group-hover:border-emerald-200 transition-all duration-300">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                  </div>

                  <h3 className="text-base font-bold text-slate-800">
                    Upload your ZIP codebase
                  </h3>
                  <p className="text-xs text-slate-450 max-w-xs mx-auto mt-2 leading-relaxed">
                    Drag and drop any ZIP containing project folders, or select multiple single files directly.
                  </p>

                  <div className="mt-8 w-full space-y-3">
                    <button
                      id="btn-browse-workspace"
                      onClick={handleTriggerExplorer}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 duration-200 flex items-center justify-center gap-2"
                    >
                      <Code2 className="w-4 h-4 text-emerald-450" />
                      <span>Browse Files</span>
                    </button>
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-px bg-slate-200 flex-1" />
                      <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">OR QUICK START</span>
                      <span className="h-px bg-slate-200 flex-1" />
                    </div>
                    <button
                      id="btn-quick-demo-start"
                      onClick={loadDemoCodebase}
                      className="w-full py-3 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer transform hover:-translate-y-0.5 duration-200 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Load Interactive Demo</span>
                    </button>
                  </div>

                  {state.error && (
                    <div className="mt-6 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600 max-w-md mx-auto flex items-center gap-2 animate-in slide-in-from-bottom-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="text-left font-semibold">{state.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Refactor Mock Terminal */}
              <div className="lg:col-span-7">
                <div className="w-full bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full relative min-h-[380px] group">
                  
                  {/* Top Window Bar */}
                  <div className="bg-slate-900/90 border-b border-slate-950/50 py-3 px-4 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      <span className="text-[10px] text-slate-500 font-bold font-mono ml-3 tracking-wide">
                        playground_terminal.sh
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPlaygroundPlaying(!playgroundPlaying)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                        title={playgroundPlaying ? "Pause simulation" : "Start simulation"}
                      >
                        {playgroundPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                      <button
                        onClick={() => setPlaygroundStep((prev) => (prev + 1) % 3)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                        title="Next step"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editor File Tabs */}
                  <div className="flex bg-slate-900 px-4 gap-1 border-b border-slate-950/30">
                    <button
                      onClick={() => { setPlaygroundStep(0); setPlaygroundPlaying(false); }}
                      className={`px-3.5 py-2.5 text-[11px] font-mono font-bold transition flex items-center gap-1.5 border-t-2 ${
                        playgroundStep === 0
                          ? "bg-slate-950 text-rose-450 border-rose-500"
                          : "text-slate-500 hover:text-slate-300 border-transparent"
                      }`}
                    >
                      <Code2 className="w-3 h-3 text-rose-500" />
                      <span>auth.js (Legacy)</span>
                    </button>
                    <button
                      onClick={() => { setPlaygroundStep(1); setPlaygroundPlaying(false); }}
                      className={`px-3.5 py-2.5 text-[11px] font-mono font-bold transition flex items-center gap-1.5 border-t-2 ${
                        playgroundStep === 1
                          ? "bg-slate-950 text-indigo-455 border-indigo-500"
                          : "text-slate-500 hover:text-slate-300 border-transparent"
                      }`}
                    >
                      <Terminal className="w-3 h-3 text-indigo-400" />
                      <span>Refactoring Log</span>
                    </button>
                    <button
                      onClick={() => { setPlaygroundStep(2); setPlaygroundPlaying(false); }}
                      className={`px-3.5 py-2.5 text-[11px] font-mono font-bold transition flex items-center gap-1.5 border-t-2 ${
                        playgroundStep === 2
                          ? "bg-slate-950 text-emerald-450 border-emerald-500"
                          : "text-slate-500 hover:text-slate-300 border-transparent"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-emerald-450" />
                      <span>auth.ts (Optimized)</span>
                    </button>
                  </div>

                  {/* Code Viewport Area */}
                  <div className="flex-1 p-5 font-mono text-[11px] leading-relaxed overflow-auto bg-slate-950/95 max-h-[300px]">
                    
                    {playgroundStep === 0 && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between text-[10px] text-rose-400 bg-rose-950/30 border border-rose-900/30 px-3 py-1.5 rounded-xl font-bold">
                          <span className="flex items-center gap-1">⚠️ Callback Hell & Missing Types</span>
                          <span className="text-[9px] uppercase tracking-wider font-mono">Line 1-12</span>
                        </div>
                        <pre className="text-slate-300 pt-2 select-all">
{`1:  function getUserData(userId, cb) {
2:    // 🔴 Vulnerable & hard to maintain callback structure
3:    db.find({ id: userId }, function(err, user) {
4:      if (err) {
5:        cb(err, null);
6:      } else {
7:        db.find({ role: user.role }, function(err, permissions) {
8:          if (err) {
9:            cb(err, null);
10:         } else {
11:           cb(null, { user: user, permissions: permissions });
12:         }
13:       });
14:     }
15:   });
16: }`}
                        </pre>
                      </div>
                    )}

                    {playgroundStep === 1 && (
                      <div className="space-y-4 animate-in fade-in duration-300 text-indigo-300">
                        <div className="flex items-center justify-between text-[10px] text-indigo-400 bg-indigo-950/30 border border-indigo-900/30 px-3 py-1.5 rounded-xl font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                            <span>Gemini LLM Refactoring Engine</span>
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-mono">Processing...</span>
                        </div>
                        <div className="space-y-2 text-xs font-semibold">
                          <p className="text-slate-400 font-mono select-none">&gt; analyzing abstract syntax tree...</p>
                          <p className="text-rose-400/90">&gt; found nesting vulnerability at line 3 & 7</p>
                          <p className="text-slate-400 font-mono select-none">&gt; creating structural transformation rules...</p>
                          <div className="bg-slate-900 p-3.5 rounded-xl space-y-1.5 text-[11px] border border-slate-800">
                            <p className="text-indigo-350">✓ Replace nested callbacks with TypeScript promises</p>
                            <p className="text-indigo-350">✓ Introduce structural UserSession and UserProfile types</p>
                            <p className="text-indigo-350">✓ Wrap operations in structured try-catch safety block</p>
                          </div>
                          <p className="text-emerald-450 animate-pulse">&gt; assembling optimized clean logic module. Code compile complete!</p>
                        </div>
                      </div>
                    )}

                    {playgroundStep === 2 && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-3 py-1.5 rounded-xl font-bold">
                          <span className="flex items-center gap-1">✨ Clean, Secure, Async & Typesafe</span>
                          <span className="text-[9px] uppercase tracking-wider font-mono">Line 1-14</span>
                        </div>
                        <pre className="text-slate-300 pt-2 select-all">
{`1:  interface UserSession {
2:    user: UserProfile;
3:    permissions: Permission[];
4:  }
5:  
6:  // 🟢 Modern, safe Async/Await API export
7:  export async function getUserData(userId: string): Promise<UserSession> {
8:    try {
9:      const user = await db.findUserProfile(userId);
10:     const permissions = await db.findPermissions(user.role);
11:     
12:     return { user, permissions };
13:   } catch (error) {
14:     logger.error(\`Failed to fetch user context: \${error.message}\`);
15:     throw new DatabaseException("Record lookup failed");
16:   }
17: }`}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Playback Progress Indicator */}
                  <div className="bg-slate-900/50 py-3.5 px-5 flex items-center justify-between border-t border-slate-950/40 select-none shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold font-mono">
                      {playgroundStep === 0 && "Step 1/3: Identify bottlenecks"}
                      {playgroundStep === 1 && "Step 2/3: Structural transformation"}
                      {playgroundStep === 2 && "Step 3/3: Optimized TypeScript output"}
                    </span>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={idx}
                          onClick={() => { setPlaygroundStep(idx); setPlaygroundPlaying(false); }}
                          className={`w-4 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            playgroundStep === idx ? "bg-emerald-500 w-6" : "bg-slate-800 hover:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Premium Interactive Showcase Segment: How the AI breaks down code */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none" />
              <div className="space-y-2 mb-8">
                <h3 className="text-lg font-bold text-slate-900">Choose your Language Playground</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click on any technology below to see the specialized prompts and deep contextual audits executed by the platform.
                </p>
              </div>

              {/* Lang Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {[
                  { id: "typescript", name: "TypeScript", icon: "TS", color: "text-blue-500 bg-blue-50 hover:bg-blue-100/70 border-blue-200/50" },
                  { id: "python", name: "Python", icon: "PY", color: "text-amber-600 bg-amber-50 hover:bg-amber-100/70 border-amber-200/50" },
                  { id: "react", name: "React (TSX)", icon: "JSX", color: "text-cyan-500 bg-cyan-50 hover:bg-cyan-100/70 border-cyan-200/50" },
                  { id: "java", name: "Java / C++", icon: "OOP", color: "text-rose-500 bg-rose-50 hover:bg-rose-100/70 border-rose-200/50" }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedShowcaseLang(lang.id)}
                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      selectedShowcaseLang === lang.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-md scale-102"
                        : `${lang.color}`
                    }`}
                  >
                    <span className="font-extrabold text-[10px] bg-white/20 px-1 py-0.5 rounded text-inherit">{lang.icon}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic lang card preview */}
              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 text-left space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                {selectedShowcaseLang === "typescript" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                        Strict Type Safeguards
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Structural Flow Mapping</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        We scan TS declarations, interface layers, return parameters, and optional union chains. The AI flags any implicitly loose `any` declarations, structural schema mismatches, or async exceptions.
                      </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl font-mono text-[10px] leading-relaxed text-blue-200 border border-slate-800">
                      <p className="text-slate-500">// TypeScript Audit Presets Applied</p>
                      <p className="text-emerald-450">&gt; checking type parameters: strictNullChecks = true</p>
                      <p className="text-indigo-400">&gt; resolving: type Payload = Record&lt;string, unknown&gt;</p>
                      <p className="text-slate-350">&gt; auditing interface boundaries: 0 implicit declarations found.</p>
                    </div>
                  </div>
                )}

                {selectedShowcaseLang === "python" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                        Idiomatic & Performant
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Pythonic Audit Checks</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Analyzes generator patterns, complex list comprehensions, decorators, context managers (`with` blocks), and structural GIL details. Suggests speedups and converts dense loops into highly readables.
                      </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl font-mono text-[10px] leading-relaxed text-amber-250 border border-slate-800">
                      <p className="text-slate-500"># Python Code Quality Audit</p>
                      <p className="text-emerald-450">&gt; optimizing memory: converting loop to generator yield</p>
                      <p className="text-indigo-400">&gt; applying context boundaries: inserting secure file read `with` open()</p>
                      <p className="text-slate-355">&gt; audit rating: 9.8/10 (PEP-8 standard compliant)</p>
                    </div>
                  </div>
                )}

                {selectedShowcaseLang === "react" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <span className="inline-block px-2.5 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                        State & Component Trees
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">React Reconciliation Reviews</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Checks component side-effects (`useEffect`), redundant re-render locks, state encapsulation boundaries, memoization pointers (`useMemo`, `useCallback`), and dynamic layout accessibility triggers.
                      </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl font-mono text-[10px] leading-relaxed text-cyan-200 border border-slate-800">
                      <p className="text-slate-500">// React Hook Verification</p>
                      <p className="text-emerald-450">&gt; audited hooks: checking component state dependencies</p>
                      <p className="text-indigo-400">&gt; optimizing render loop: memoizing heavy calculation trees</p>
                      <p className="text-slate-300">&gt; verified layout accessibility: 100% markup compliance</p>
                    </div>
                  </div>
                )}

                {selectedShowcaseLang === "java" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                        Solid Architecture
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Object-Oriented Design Audits</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Validates inheritance depth, polymorphism patterns, generic boundaries, concurrency controls (multithreading safeties), resource handle closures, and abstract factory configurations.
                      </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl font-mono text-[10px] leading-relaxed text-rose-350 border border-slate-800">
                      <p className="text-slate-500">// OOP Safety Boundary Check</p>
                      <p className="text-emerald-450">&gt; memory safety check: resources properly enclosed in try-with-resources</p>
                      <p className="text-indigo-400">&gt; concurrency check: validated volatile reference locks</p>
                      <p className="text-slate-300">&gt; checked solid design compliance: single responsibility met.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Workflow section */}
            <div className="space-y-8 pt-2">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">The Modern Pipeline Flow</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  How our system translates code into understanding in four cohesive steps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
                {[
                  {
                    step: "01",
                    title: "Client-Side Upload",
                    description: "Drop a ZIP file. Everything is read client-side. No files are stored or kept on servers, providing maximum codebase security.",
                    color: "border-emerald-250 bg-emerald-50/30 text-emerald-800"
                  },
                  {
                    step: "02",
                    title: "Instant Multi-File Mapping",
                    description: "We build a fully structured code navigation system and catalog target sizes, scopes, imports, and file paths immediately.",
                    color: "border-indigo-250 bg-indigo-50/30 text-indigo-800"
                  },
                  {
                    step: "03",
                    title: "Interactive AI Chat Tutor",
                    description: "Switch seamlessly between structural guides, reading explanations aloud, and a custom context-aware AI Tutor chat dialogue.",
                    color: "border-emerald-250 bg-emerald-50/30 text-emerald-800"
                  },
                  {
                    step: "04",
                    title: "Export Updated ZIP",
                    description: "Refactor code files inside comparative side-by-side diff review, save changes, and export the modified repository back directly.",
                    color: "border-indigo-250 bg-indigo-50/30 text-indigo-800"
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-6 border rounded-2xl bg-white shadow-2xs hover:shadow-xs hover:scale-[1.01] transition duration-200 text-left relative flex flex-col justify-between h-full group`}
                  >
                    <div className="space-y-3">
                      <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-black rounded-lg ${item.color}`}>
                        STEP {item.step}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slick Feature showcase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
                  title: "Analogy-Driven AI Explanations",
                  description: "Deconstruct dense archives, architectural relationships, import patterns, and directories into highly detailed guides with 3 formats: Simple Metaphor, Flow Mechanics, or Performance/Security Audit checks.",
                  bg: "bg-emerald-50/50 border-emerald-100/60"
                },
                {
                  icon: <Wand2 className="w-5 h-5 text-indigo-650" />,
                  title: "Selective Refactoring & Diff reviews",
                  description: "Optimize algorithms, document codebases, generate test suites, or execute strict type corrections. Review changes inside a responsive side-by-side Git Diff view before choosing to apply or discard.",
                  bg: "bg-indigo-50/50 border-indigo-100/60"
                },
                {
                  icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
                  title: "Interactive AI Chat Tutor",
                  description: "Engage in deep, context-aware technical chats with local question-history. Ask custom questions, trace function execution hierarchies, or brainstorm API configurations with automated suggestions.",
                  bg: "bg-emerald-50/50 border-emerald-100/60"
                },
                {
                  icon: <Volume2 className="w-5 h-5 text-indigo-650" />,
                  title: "Accented Multi-Language Voice Reading",
                  description: "Listen to natural synthesized narration of explanation guides with authentic native language accents. Perfect for multi-tasking or developers who learn best through auditory tutorials. 17 languages supported.",
                  bg: "bg-indigo-50/50 border-indigo-100/60"
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs hover:scale-[1.01] transition duration-200 text-left flex gap-4`}
                >
                  <div className={`p-3 rounded-xl border self-start ${feature.bg} shrink-0`}>
                    {feature.icon}
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-900">{feature.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          /* Main Functional Split Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Controls & Navigation Files (Grid size 4) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Settings Controller pane */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 select-none">
                  <GraduationCap className="w-4 h-4 text-slate-700" />
                  <h3 id="panel-settings-title" className="text-xs font-bold text-slate-900">
                    Explanation Customization
                  </h3>
                </div>

                {/* Target Language Dropdown Selector */}
                <LanguageSelector selectedLanguage={targetLanguage} onLanguageChange={setTargetLanguage} />

                {/* Explanation Depth Level select buttons */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 select-none">
                    Breakdown Style Format
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                    {(["simple", "developer", "analyst"] as const).map((modeValue) => (
                      <button
                        key={modeValue}
                        onClick={() => setMode(modeValue)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold tracking-tight capitalize transition cursor-pointer ${
                          mode === modeValue
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-655 hover:bg-slate-50"
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
                  <p className="text-[9px] text-slate-400 mt-1 pb-1 select-none">
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
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-100 disabled:text-slate-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md disabled:shadow-none cursor-pointer"
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
                onSelectPath={(path) => {
                  setSelectedPath(path);
                  setRefactoredContent(null); // Reset proposed refactoring view when changing file path selection
                }}
                onExplainRequested={(path) => {
                  setSelectedPath(path);
                  setRefactoredContent(null);
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
                onRefactorApplied={handleRefactorApplied}
                isRefactoring={isRefactoring}
                refactoredContent={refactoredContent}
                setRefactoredContent={setRefactoredContent}
                onTriggerRefactor={handleTriggerRefactor}
              />

              {/* Tabs Section for Dual-Context Interaction Panel */}
              <div className="space-y-4">
                <div className="flex bg-slate-200/60 border border-slate-250 p-1.5 rounded-2xl w-fit shrink-0 select-none shadow-2xs">
                  <button
                    onClick={() => setActiveTab("explanation")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === "explanation"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-605 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Explanation Guide</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("tutor_chat")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === "tutor_chat"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-605 hover:bg-slate-100"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>AI Tutor Chat Q&A</span>
                  </button>
                </div>

                {activeTab === "explanation" ? (
                  /* Original Explanation Outcome Section */
                  <div id="explanation-anchor" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 scroll-mt-20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 select-none">
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
                            <LoaderIcon className="w-3 h-3 animate-spin text-amber-605" />
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
                          <p className="text-xs text-slate-505 mt-4 font-bold tracking-tight">
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
                        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 select-none">
                          <div className="p-3 bg-white border border-slate-55 rounded-2xl shadow-sm text-slate-350 mb-2">
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">No active explanation generated</p>
                          <p className="text-[10px] text-slate-405 mt-1 px-4 max-w-sm">
                            Select a specific file or the full workspace above, configure your language settings, and press **Explain** to trigger artificial intelligence tutoring.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  /* Interactive AI Tutor Chat View */
                  <TutorChat
                    files={files}
                    selectedPath={selectedPath}
                    language={targetLanguage}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-205 mt-12 py-6 bg-white shrink-0 text-center select-none">
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
