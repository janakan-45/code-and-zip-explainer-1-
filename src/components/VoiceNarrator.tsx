import React, { useState, useEffect, useRef } from "react";
import { Language } from "../types";
import { Play, Pause, Square, Volume2, VolumeX, AlertCircle, Sparkles } from "lucide-react";

interface VoiceNarratorProps {
  text: string;
  language: Language;
}

export function VoiceNarrator({ text, language }: VoiceNarratorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [supported, setSupported] = useState(true);
  const [cleanText, setCleanText] = useState("");
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis and Clean Markdown for Voice
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    } else {
      setSupported(false);
    }

    return () => {
      stopSpeech();
    };
  }, []);

  // Prepare cleaner narrative text of explanation (strips markdown signs, filters code blocks for spoken comfort)
  useEffect(() => {
    if (!text) {
      setCleanText("");
      return;
    }

    // 1. Strip multi-line code blocks completely (replace with silent space)
    let processed = text.replace(/```[\s\S]*?```/g, " ");

    // 2. Remove HTML/XML tags entirely so it doesn't speak "less than title greater than"
    processed = processed.replace(/<[^>]*>/g, " ");

    // 3. Convert headers to natural voice pauses / transitions
    processed = processed.replace(/^#+\s*(.*?)$/gm, "$1. ");

    // 4. Strip specific markdown formatting symbols and punctuation that get read awkwardly
    processed = processed.replace(/[`*_\-\[\]\(\)#~+=|\\/]/g, " ");

    // 5. Clean up duplicate spaces and newlines
    processed = processed.replace(/\s+/g, " ").trim();
    
    setCleanText(processed);
  }, [text]);

  // Handle language switch during active playback - must restart speaking to apply correct voice accent
  useEffect(() => {
    if (isPlaying) {
      stopSpeech();
      // Delay slightly and auto-play in the new language if active
      const timer = setTimeout(() => {
        speakText();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [language]);

  const speakText = () => {
    const synth = synthRef.current;
    if (!synth || !cleanText) return;

    // If synth is currently paused, resuming handles it cleanly
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synth.cancel(); // Stop any pending work

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    // Set speech rates and language details
    utterance.rate = rate;
    
    // Attempt to locate a proper local voice matching the language code
    const voices = synth.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(language.code.split("-")[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    } else {
      // Fallback: try general language code match
      const fallbackVoice = voices.find((v) => v.lang.includes(language.code.split("-")[0]));
      if (fallbackVoice) utterance.voice = fallbackVoice;
    }

    // Set locale language explicitly
    utterance.lang = language.code;

    // Track speech lifecycle events
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pauseSpeech = () => {
    const synth = synthRef.current;
    if (synth && synth.speaking) {
      synth.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const stopSpeech = () => {
    const synth = synthRef.current;
    if (synth) {
      synth.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      // Must restart to apply pitch/rate changes on the fly
      stopSpeech();
      setTimeout(() => {
        speakText();
      }, 50);
    }
  };

  if (!supported) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 text-slate-500 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-slate-400" />
        <span>Primary Voice Synthesis is not supported in this environment/browser.</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info header */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-900 rounded-xl text-white shadow-sm shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 id="narration-title" className="text-xs font-semibold text-slate-900">
              Read Aloud (Voice Tutor)
            </h4>
            <p className="text-[10px] text-slate-400">
              Reads your translation aloud in the selected language accent
            </p>
          </div>
        </div>

        {/* Playback rate presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[10px] text-slate-400 font-medium mr-1">Speed:</span>
          {[0.8, 1.0, 1.25, 1.5].map((speedValue) => (
            <button
              key={speedValue}
              onClick={() => handleRateChange(speedValue)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight transition cursor-pointer ${
                rate === speedValue
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {speedValue}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Narrative Controls Card */}
      <div className="mt-4 bg-white border border-slate-150 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          {/* Waveform Animation */}
          <div className="flex items-center gap-0.5 h-6 w-8 shrink-0">
            {isPlaying ? (
              [1, 2, 3, 4, 3, 2, 1].map((step, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-slate-800 rounded-full animate-bounce"
                  style={{
                    height: `${step * 25}%`,
                    animationDelay: `${idx * 0.1}s`,
                    animationDuration: "1s",
                  }}
                />
              ))
            ) : (
              <div className="w-full flex items-center justify-center text-slate-300">
                <VolumeX className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div className="text-[11px] font-medium text-slate-800 truncate">
              {isPlaying ? `Speaking in matching accent (${language.name})...` : isPaused ? "Voice Narrator Paused" : "Click Play to Narrate"}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {cleanText ? `${cleanText.substring(0, 120)}...` : "Choose files and request an explanation first."}
            </div>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="flex items-center gap-1 shrink-0">
          {isPlaying ? (
            <button
              onClick={pauseSpeech}
              title="Pause narration"
              disabled={!cleanText}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={speakText}
              title="Play narration"
              disabled={!cleanText}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer disabled:opacity-40 shadow-sm"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={stopSpeech}
            title="Stop narration"
            disabled={!isPlaying && !isPaused}
            className="p-2 hover:bg-slate-105 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer disabled:opacity-30"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
