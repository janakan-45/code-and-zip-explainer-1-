import React, { useState } from "react";
import { LANGUAGES } from "../data/languages";
import { Language } from "../types";
import { Globe, Search, Check, ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block w-full sm:w-64">
      <label className="block text-xs font-medium text-slate-500 mb-1">
        Mother Tongue / Target Language
      </label>
      <button
        id="btn-lang-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm text-sm text-slate-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/10"
      >
        <span className="flex items-center gap-2">
          <span className="text-base pointer-events-none">{selectedLanguage.flag}</span>
          <span className="font-semibold pointer-events-none text-slate-800">
            {selectedLanguage.name} <span className="text-slate-400 font-normal">({selectedLanguage.nativeName})</span>
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
      </button>

      {isOpen && (
        <>
          {/* Overlay to close the select */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-full mt-2 w-full bg-white border border-slate-150 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Search language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent border-0 focus:ring-0 p-1 outline-none text-slate-700"
                autoFocus
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
              {filteredLanguages.length === 0 ? (
                <div className="py-4 px-3 text-xs text-slate-400 text-center">
                  No matching languages found
                </div>
              ) : (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                      selectedLanguage.code === lang.code
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm shrink-0">{lang.flag}</span>
                      <span>
                        {lang.name}{" "}
                        <span
                          className={`text-[10px] ${
                            selectedLanguage.code === lang.code ? "text-slate-300" : "text-slate-400"
                          } font-normal`}
                        >
                          ({lang.nativeName})
                        </span>
                      </span>
                    </span>
                    {selectedLanguage.code === lang.code && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                ))
              )}
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Full explanation and TTS voice translates instantly</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
