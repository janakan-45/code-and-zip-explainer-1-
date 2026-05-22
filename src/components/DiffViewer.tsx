import React from "react";

interface DiffViewerProps {
  originalContent: string;
  refactoredContent: string;
}

export function DiffViewer({ originalContent, refactoredContent }: DiffViewerProps) {
  const originalLines = originalContent.split("\n");
  const refactoredLines = refactoredContent.split("\n");

  const maxLines = Math.max(originalLines.length, refactoredLines.length);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-xs font-mono select-none overflow-hidden h-[340px] sm:h-[380px]">
      <div className="grid grid-cols-2 bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 shrink-0">
        <div className="px-4 py-2 border-r border-slate-800 flex items-center justify-between">
          <span>ORIGINAL CODE</span>
          <span className="text-[9px] bg-rose-950/50 text-rose-450 px-1.5 py-0.5 rounded border border-rose-900/35">Before</span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between">
          <span>REFACTORED CODE</span>
          <span className="text-[9px] bg-emerald-950/50 text-emerald-450 px-1.5 py-0.5 rounded border border-emerald-900/35">Proposed Changes</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Original */}
        <div className="w-1/2 overflow-auto border-r border-slate-800 h-full scrollbar-thin select-text">
          <div className="py-2">
            {Array.from({ length: maxLines }).map((_, i) => {
              const line = originalLines[i];
              const refLine = refactoredLines[i];
              const isDifferent = line !== refLine;
              const hasLine = i < originalLines.length;

              return (
                <div
                  key={i}
                  className={`flex items-start min-h-[20px] px-2 leading-5 ${
                    isDifferent && hasLine
                      ? "bg-rose-950/30 text-rose-250 border-l-2 border-rose-600"
                      : "hover:bg-slate-800/40 text-slate-400"
                  }`}
                >
                  <span className="w-8 text-right pr-3 text-[10px] text-slate-600 select-none shrink-0 font-sans">
                    {hasLine ? i + 1 : ""}
                  </span>
                  <pre className="whitespace-pre overflow-x-auto grow text-left font-mono">
                    {hasLine ? line || " " : ""}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Refactored */}
        <div className="w-1/2 overflow-auto h-full scrollbar-thin select-text">
          <div className="py-2">
            {Array.from({ length: maxLines }).map((_, i) => {
              const line = originalLines[i];
              const refLine = refactoredLines[i];
              const isDifferent = line !== refLine;
              const hasLine = i < refactoredLines.length;

              return (
                <div
                  key={i}
                  className={`flex items-start min-h-[20px] px-2 leading-5 ${
                    isDifferent && hasLine
                      ? "bg-emerald-950/30 text-emerald-250 border-l-2 border-emerald-500"
                      : "hover:bg-slate-800/40 text-slate-300"
                  }`}
                >
                  <span className="w-8 text-right pr-3 text-[10px] text-slate-600 select-none shrink-0 font-sans">
                    {hasLine ? i + 1 : ""}
                  </span>
                  <pre className="whitespace-pre overflow-x-auto grow text-left font-mono">
                    {hasLine ? refLine || " " : ""}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
