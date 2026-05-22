import React, { useState } from "react";
import { CodeFile } from "../types";
import { Copy, Check, FileCode, PlaySquare, FileText, Wand2, Undo2, CheckCheck, Loader2 } from "lucide-react";
import { DiffViewer } from "./DiffViewer";

interface CodeViewerProps {
  file: CodeFile | null;
  onExplainRequested: () => void;
  isAnalyzing: boolean;
  onRefactorApplied: (refactoredCode: string) => void;
  isRefactoring: boolean;
  refactoredContent: string | null;
  setRefactoredContent: (content: string | null) => void;
  onTriggerRefactor: (prompt: string) => Promise<void>;
}

export function CodeViewer({
  file,
  onExplainRequested,
  isAnalyzing,
  onRefactorApplied,
  isRefactoring,
  refactoredContent,
  setRefactoredContent,
  onTriggerRefactor,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showRefactorDropdown, setShowRefactorDropdown] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePresetSelect = async (prompt: string) => {
    setShowRefactorDropdown(false);
    setShowCustomPromptInput(false);
    await onTriggerRefactor(prompt);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setShowRefactorDropdown(false);
    setShowCustomPromptInput(false);
    await onTriggerRefactor(customPrompt);
    setCustomPrompt("");
  };

  if (!file) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 h-[400px] sm:h-[460px] flex flex-col items-center justify-center text-center shadow-inner select-none">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 mb-3">
          <FileText className="w-8 h-8 mx-auto" />
        </div>
        <h4 id="empty-viewer-title" className="text-sm font-semibold text-slate-800">
          Viewing Entire Archive
        </h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          You have selected the full project scope. Press the &quot;Explain Project&quot; button to analyze relationships across all files together.
        </p>
      </div>
    );
  }

  const lines = file.content.split("\n");

  return (
    <div className="bg-slate-900 shadow-xl border border-slate-800 rounded-2xl flex flex-col h-[400px] sm:h-[460px] overflow-hidden relative">
      {/* Code Header bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-mono font-medium text-slate-100 truncate block">
              {file.name}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block truncate max-w-md">
              {file.path}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 shrink-0">
          {refactoredContent ? (
            /* Diff view controls */
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRefactoredContent(null)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition rounded-lg text-xs font-bold cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                onClick={() => onRefactorApplied(refactoredContent)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition rounded-lg text-xs font-bold cursor-pointer shadow-md"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply Changes</span>
              </button>
            </div>
          ) : (
            /* Normal view controls */
            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Copy file code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Refactor Trigger dropdown button */}
              <div className="relative">
                <button
                  onClick={() => setShowRefactorDropdown(!showRefactorDropdown)}
                  disabled={isRefactoring}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700/60 hover:bg-slate-750 text-slate-200 hover:text-white disabled:opacity-50 transition rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isRefactoring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Refactoring...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>Refactor</span>
                    </>
                  )}
                </button>

                {showRefactorDropdown && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-slate-950 border border-slate-850 rounded-xl shadow-xl z-20 py-1.5 text-left animate-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1 border-b border-slate-800 pb-1.5 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Preset Instructions
                      </span>
                    </div>
                    {[
                      { label: "🚀 Optimize Performance", prompt: "Optimize memory and speed of this code." },
                      { label: "🛡️ Add Error Handling", prompt: "Add robust error catching, edge case boundaries, and safety validation guards." },
                      { label: "📝 Add TS Types & JSDoc", prompt: "Convert or document this code with perfect JSDoc comments, typescript interfaces/types, and parameters definitions." },
                      { label: "🧪 Generate Jest Tests", prompt: "Generate clean Jest unit testing suite covering all functions and edge scenarios in this code." },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePresetSelect(preset.prompt)}
                        className="w-full px-3.5 py-2 hover:bg-slate-900 text-left text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <div className="border-t border-slate-805 my-1"></div>
                    <button
                      onClick={() => {
                        setShowCustomPromptInput(true);
                        setShowRefactorDropdown(false);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-900 text-left text-xs font-semibold text-emerald-400 hover:text-emerald-350 transition-colors cursor-pointer"
                    >
                      ✏️ Custom Instruction...
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onExplainRequested}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 transition rounded-lg text-xs font-bold cursor-pointer"
              >
                <PlaySquare className="w-3.5 h-3.5" />
                <span>Explain File</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content Display or DiffViewer */}
      {isRefactoring ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-400 select-none">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <h4 className="text-xs font-bold text-slate-200 mt-4">Synthesizing refactored code structure...</h4>
          <p className="text-[10px] text-slate-500 max-w-xs mt-1">
            Gemini is optimizing your code structure according to your chosen refactoring instructions. This will render a side-by-side diff overlay.
          </p>
        </div>
      ) : refactoredContent ? (
        <DiffViewer originalContent={file.content} refactoredContent={refactoredContent} />
      ) : (
        <div className="flex-1 overflow-auto font-mono text-xs text-slate-350 p-4 leading-relaxed flex scrollbar-thin select-text">
          {/* Line Numbers column */}
          <div className="select-none text-right pr-4 border-r border-slate-800 text-slate-600 shrink-0 min-w-[2.5rem]">
            {lines.map((_, i) => (
              <div key={i} className="h-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Source Text Code */}
          <pre className="pl-4 select-text grow w-full overflow-x-auto h-full text-slate-300">
            {lines.map((line, i) => (
              <code key={i} className="h-5 block whitespace-pre font-mono">
                {line || " "}
              </code>
            ))}
          </pre>
        </div>
      )}

      {/* Custom Prompt Input overlay */}
      {showCustomPromptInput && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-6 z-30 select-none">
          <form onSubmit={handleCustomSubmit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              Custom Refactoring Instruction
            </h4>
            <p className="text-[10px] text-slate-400">
              Type exactly what you want the AI to rewrite, optimize, or generate in this file.
            </p>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. rewrite this using async/await and add docstrings"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-505"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCustomPromptInput(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold cursor-pointer"
              >
                Start Refactor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive status meter footer */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-850 text-[10px] text-slate-400 font-sans flex justify-between shrink-0 select-none">
        <span>Lines: {lines.length}</span>
        <span>Size: {(file.size / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  );
}
