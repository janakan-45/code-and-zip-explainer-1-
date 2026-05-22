import React, { useState, useMemo } from "react";
import { CodeFile } from "../types";
import { Folder, FolderOpen, FileCode, CheckSquare, Square, ChevronRight, ChevronDown, Search, FolderSync } from "lucide-react";

interface FileTreeProps {
  files: CodeFile[];
  selectedPath: string | null;
  onSelectPath: (path: string | null) => void;
  onExplainRequested: (path: string | null) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: { [key: string]: TreeNode };
  file?: CodeFile;
}

export function FileTree({ files, selectedPath, onSelectPath, onExplainRequested }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({
    root: true,
  });

  // Toggle folder open/closed state
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Convert array of files to a nested tree node structure
  const nestingTree = useMemo(() => {
    const root: TreeNode = { name: "root", path: "root", isFolder: true, children: {} };

    files.forEach((file) => {
      // Filter files on search
      if (searchQuery && !file.path.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const segments = file.path.split("/").filter(Boolean);
      let current = root;
      let cumulativePath = "";

      segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        cumulativePath = cumulativePath ? `${cumulativePath}/${segment}` : segment;

        if (!current.children[segment]) {
          current.children[segment] = {
            name: segment,
            path: cumulativePath,
            isFolder: !isLast,
            children: {},
            file: isLast ? file : undefined,
          };
        }
        current = current.children[segment];
      });
    });

    return root;
  }, [files, searchQuery]);

  // Recursively render the tree node
  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.path !== "root" && node.isFolder) {
      const isExpanded = !!expandedFolders[node.path];
      const sortedChildren = Object.values(node.children).sort((a, b) => {
        // Folders first, files second
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      return (
        <div key={node.path} className="select-none">
          <button
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
            className="w-full flex items-center justify-between py-1.5 hover:bg-slate-50 rounded-lg text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </span>
          </button>

          {isExpanded && (
            <div className="mt-0.5">
              {sortedChildren.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else if (node.path !== "root" && !node.isFolder && node.file) {
      const isSelected = selectedPath === node.path;
      const file = node.file;
      const sizeInKb = (file.size / 1024).toFixed(1);

      return (
        <div key={node.path} style={{ paddingLeft: `${depth * 12 + 20}px` }} className="group/item select-none mt-0.5">
          <div
            className={`flex items-center justify-between p-1.5 rounded-lg transition text-left cursor-pointer ${
              isSelected ? "bg-slate-950 text-white" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            {/* Click node to load file into active previewer */}
            <button
              onClick={() => onSelectPath(node.path)}
              className="flex items-center gap-2 text-xs truncate text-left grow w-full font-mono cursor-pointer"
            >
              <FileCode className={`w-3.5 h-3.5 ${isSelected ? "text-slate-300" : "text-slate-400"}`} />
              <span className="truncate">{node.name}</span>
              <span className={`text-[9px] font-sans ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                ({sizeInKb} KB)
              </span>
            </button>

            {/* Quick Actions trigger within file line */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExplainRequested(node.path);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-bold transition cursor-pointer ${
                  isSelected ? "bg-white text-slate-900 border-0" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Explain
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default root rendering
    const sortedKids = Object.values(node.children).sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return <div className="space-y-0.5">{sortedKids.map((child) => renderNode(child, depth))}</div>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-[400px] sm:h-[460px]">
      <div className="flex items-center justify-between mb-3 text-slate-900">
        <div className="flex items-center gap-1.5">
          <FolderSync className="w-4 h-4 text-slate-700" />
          <h3 id="tree-title" className="text-sm font-semibold tracking-tight">
            Project Files
          </h3>
        </div>
        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Real-time search inside archives */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute w-4 h-4 text-slate-400 left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter files by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 text-slate-800 transition"
        />
      </div>

      {/* Select Entire Archive trigger */}
      <button
        onClick={() => onSelectPath(null)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl mb-3 text-xs transition text-left cursor-pointer ${
          selectedPath === null
            ? "bg-slate-900 text-white border-slate-900 font-semibold"
            : "border-slate-200 hover:border-slate-300 text-slate-705 bg-slate-50/50"
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedPath === null ? (
            <CheckSquare className="w-4 h-4 text-white shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>Full Project Explainer</span>
        </span>
        <span className="text-[9px] opacity-75">(Combine all files)</span>
      </button>

      {/* Scrolled container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <p className="text-xs text-slate-400 font-medium">No files extracted yet.</p>
          </div>
        ) : (
          renderNode(nestingTree)
        )}
      </div>
    </div>
  );
}
