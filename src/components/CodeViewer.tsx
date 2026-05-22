import React, { useState } from "react";
import { CodeFile } from "../types";
import { Copy, Check, FileCode, PlaySquare, FileText } from "lucide-react";

interface CodeViewerProps {
  file: CodeFile | null;
  onExplainRequested: () => void;
  isAnalyzing: boolean;
}

export function CodeViewer({ file, onExplainRequested, isAnalyzing }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!file) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 h-[400px] sm:h-[460px] flex flex-col items-center justify-center text-center shadow-inner">
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

  // Generate numbered list lines
  const lines = file.content.split("\n");

  return (
    <div className="bg-slate-900 shadow-xl border border-slate-800 rounded-2xl flex flex-col h-[400px] sm:h-[460px] overflow-hidden">
      {/* Code Header bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
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
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Copy file code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onExplainRequested}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 transition rounded-lg text-xs font-bold cursor-pointer"
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Explain File</span>
          </button>
        </div>
      </div>

      {/* Editor Content Display zone */}
      <div className="flex-1 overflow-auto font-mono text-xs text-slate-350 p-4 leading-relaxed flex scrollbar-thin">
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
            <code key={i} className="h-5 block whitespace-pre">
              {line || " "}
            </code>
          ))}
        </pre>
      </div>

      {/* Interactive status meter footer */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-850 text-[10px] text-slate-400 font-sans flex justify-between shrink-0">
        <span>Lines: {lines.length}</span>
        <span>Size: {(file.size / 1024).toFixed(2)} KB</span>
      </div>
    </div>
  );
}
