import React, { useState, useRef, useEffect } from "react";
import { CodeFile, Language } from "../types";
import { Send, Bot, User, Sparkles, RefreshCw, MessageSquare, HelpCircle } from "lucide-react";
import Markdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TutorChatProps {
  files: CodeFile[];
  selectedPath: string | null;
  language: Language;
}

export function TutorChat({ files, selectedPath, language }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    setError(null);
    if (!customText) {
      setInput("");
    }

    const newMessages = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: files.map((f) => ({ path: f.path, content: f.content })),
          selectedPath,
          messages: newMessages,
          language: language.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response from AI Tutor.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to communicate with the tutor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestions = selectedPath
    ? [
        `What does the active file ${selectedPath.split("/").pop()} do?`,
        "Suggest 3 ways to optimize this code.",
        "Write some unit tests for this file.",
        "Explain any potential security risks here.",
      ]
    : [
        "Explain the high-level architecture of this project.",
        "How do the files interact with each other?",
        "Where is the entry point of this codebase?",
        "Suggest general architectural upgrades.",
      ];

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden h-[480px] shadow-sm">
      {/* Chat Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Interactive AI Code Tutor</span>
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100/60 px-1 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200/30">
                <Sparkles className="w-2.5 h-2.5" />
                Dual-Context
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {selectedPath ? `Focused on file: ${selectedPath.split("/").pop()}` : "Focused on entire project archive"}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900 transition-colors font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg hover:shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-10 space-y-6">
            <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-350">
              <Bot className="w-8 h-8 mx-auto text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Ask your AI Tutor anything about the code
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                The tutor understands the whole structure, dependencies, execution flows, and selected files. Answers are delivered in {language.flag} {language.name}.
              </p>
            </div>

            {/* Quick Suggestions */}
            <div className="w-full space-y-2">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block text-left">
                Suggested Questions
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="w-full text-left p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] text-slate-650 transition cursor-pointer font-medium shadow-2xs hover:shadow-sm"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                } animate-in fade-in duration-200`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`user-bubble rounded-2xl p-4.5 text-xs text-left shadow-2xs select-text ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-800 border border-slate-200/80"
                  }`}
                >
                  <div className="markdown-body transition select-text prose-sm max-w-none text-inherit">
                    <Markdown
                      components={{
                        // Ensure markdown nested inside speech bubbles respects background/text theme colors
                        code({ node, className, children, ...props }) {
                          return (
                            <code
                              className={`${
                                msg.role === "user"
                                  ? "bg-slate-800 text-white"
                                  : "bg-slate-100 text-slate-900"
                              } px-1.5 py-0.5 rounded font-mono text-[11px]`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </Markdown>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
                <div className="w-7.5 h-7.5 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Tutor is analyzing...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600 flex items-center gap-2 max-w-md mx-auto">
                <HelpCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="text-left font-medium">{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-white border-t border-slate-200 p-4 flex gap-2 shrink-0 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedPath ? `Ask about ${selectedPath.split("/").pop()}...` : "Ask a question about the project archive..."}
          disabled={loading}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 text-slate-800 transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:bg-slate-100 disabled:text-slate-400 shadow-sm transition shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
