/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { WorkflowStep, Language } from "../types";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Terminal,
  FileCode,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Cpu,
  Layers,
  Activity
} from "lucide-react";

interface WorkflowPlayerProps {
  steps: WorkflowStep[];
  language?: Language;
}

export function WorkflowPlayer({ steps, language }: WorkflowPlayerProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // Percentage progress of the active step ticker
  const playerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = steps.length;
  const activeStep = steps[currentStep] || null;

  // Restart the player from the beginning
  const handleReset = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const handlePrev = () => {
    setProgress(0);
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : totalSteps - 1));
  };

  const handleNext = () => {
    setProgress(0);
    setCurrentStep((prev) => (prev < totalSteps - 1 ? prev + 1 : 0));
  };

  const handleStepClick = (index: number) => {
    setProgress(0);
    setCurrentStep(index);
  };

  // Handle Play/Pause execution
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      // Step duration is 5000ms. Update progress bar every 50ms
      const stepDuration = 5000;
      const progressInterval = 50;
      const increment = (progressInterval / stepDuration) * 100;

      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Step complete, transition to next
            setCurrentStep((curr) => (curr < totalSteps - 1 ? curr + 1 : 0));
            return 0;
          }
          return prev + increment;
        });
      }, progressInterval);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, totalSteps, currentStep]);

  if (totalSteps === 0 || !activeStep) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 select-none shadow-sm">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl w-fit mx-auto text-slate-350 mb-3 shadow-xs">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-xs font-bold text-slate-800">Visual Workflow Preview Ready</h4>
        <p className="text-[10px] text-slate-405 mt-1 px-4 max-w-sm mx-auto leading-relaxed">
          Our system maps function paths, loops, exception parameters, and modules. Once you trigger an AI explanation, an interactive animated workflow player will render here.
        </p>
      </div>
    );
  }

  // HSL Color mappings for different visual nodes
  const typeConfigs = {
    input: {
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50/50 border-emerald-200",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-250",
      icon: "📥",
      title: "Input Parameter Ingestion"
    },
    condition: {
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-50/50 border-amber-200",
      badge: "bg-amber-100 text-amber-800 border-amber-250",
      icon: "🔀",
      title: "Conditional Decision Branch"
    },
    operation: {
      color: "from-indigo-500 to-blue-500",
      bg: "bg-indigo-50/50 border-indigo-200",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-250",
      icon: "⚡",
      title: "Algorithmic Operation"
    },
    error: {
      color: "from-rose-500 to-pink-500",
      bg: "bg-rose-50/50 border-rose-200",
      badge: "bg-rose-100 text-rose-800 border-rose-250",
      icon: "🚨",
      title: "Exception Boundary Check"
    },
    output: {
      color: "from-cyan-500 to-teal-500",
      bg: "bg-cyan-50/50 border-cyan-200",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-250",
      icon: "📤",
      title: "Return Value Output"
    },
    network: {
      color: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50/50 border-blue-200",
      badge: "bg-blue-100 text-blue-800 border-blue-250",
      icon: "🌐",
      title: "External Network Request"
    },
    render: {
      color: "from-purple-500 to-fuchsia-500",
      bg: "bg-purple-50/50 border-purple-200",
      badge: "bg-purple-100 text-purple-800 border-purple-250",
      icon: "🖥️",
      title: "User Interface Render Paint"
    }
  };

  const currentType = typeConfigs[activeStep.type] || typeConfigs.operation;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md space-y-4 animate-in fade-in duration-300">
      
      {/* Header bar */}
      <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
            <Cpu className="w-4 h-4 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>🎬 Interactive Visual Code Workflow</span>
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black rounded-md uppercase tracking-wider border border-indigo-100">
                VIDEO EXPLAINER
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold leading-none mt-1">
              Playback an automated step-by-step animated walkthrough of code execution layers
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs self-start sm:self-auto">
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
            title="Restart playback"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrev}
            className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
            title="Previous step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shadow-2xs ${
              isPlaying
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-emerald-500 hover:bg-emerald-450 text-slate-950"
            }`}
            title={isPlaying ? "Pause visual walkthrough" : "Play visual walkthrough"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
            title="Next step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dual Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6">
        
        {/* LEFT COLUMN: Animated Visual Pipeline & Flow Node (size 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Active Flow Node Canvas */}
          <div className={`p-6 border rounded-2xl shadow-2xs flex-1 flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[220px] transition-all duration-300 ${currentType.bg}`}>
            
            {/* Dynamic visual bubble background indicator */}
            <div className={`absolute -right-16 -top-16 w-36 h-36 bg-gradient-to-tr ${currentType.color} rounded-full blur-3xl opacity-20 transition pointer-events-none`} />
            <div className={`absolute -left-16 -bottom-16 w-36 h-36 bg-gradient-to-bl ${currentType.color} rounded-full blur-3xl opacity-20 transition pointer-events-none`} />

            {/* Step Node Icon Shield */}
            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${currentType.color} flex items-center justify-center text-2xl shadow-md text-white border border-white/20 select-none animate-float-slow transform scale-102 mt-4`}>
              {currentType.icon}
            </div>

            {/* Step Description details */}
            <div className="space-y-2 mt-4 w-full z-10">
              <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-black rounded-lg uppercase tracking-wide ${currentType.badge}`}>
                Step {currentStep + 1} of {totalSteps} • {activeStep.type}
              </span>
              <h4 className="text-xs font-bold text-slate-900 px-2 leading-tight">
                {activeStep.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed px-4 font-semibold">
                {activeStep.description}
              </p>
            </div>

            {/* Path metadata node link */}
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-white/60 px-3 py-1 border border-slate-150 rounded-xl select-none shadow-3xs">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[120px] font-bold">{activeStep.file.split("/").pop()}</span>
              <span className="text-slate-300">:</span>
              <span className="text-indigo-600 font-extrabold">L{activeStep.lineRange}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Monospace Debugger Editor snippet viewport (size 7) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="w-full bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full relative min-h-[220px]">
            
            {/* Top Bar window */}
            <div className="bg-slate-900/90 border-b border-slate-950/50 py-2 px-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[9px] text-slate-500 font-bold font-mono ml-3 tracking-wide truncate max-w-[200px]">
                  {activeStep.file}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-emerald-450 font-mono bg-emerald-950/20 px-2 py-0.5 border border-emerald-900/20 rounded font-semibold animate-pulse">
                <span>Debugger Active</span>
              </div>
            </div>

            {/* Code Snippet lines */}
            <div className="flex-1 p-4 font-mono text-[10.5px] leading-relaxed overflow-auto bg-slate-950/95 max-h-[240px]">
              <div className="flex items-start gap-3">
                {/* Simulated line count */}
                <div className="text-slate-600 text-right select-none pr-1.5 border-r border-slate-800 text-[10px]">
                  {activeStep.lineRange.includes("-") ? (
                    activeStep.lineRange.split("-").map((line, idx) => (
                      <div key={idx}>{parseInt(line) + idx}</div>
                    ))
                  ) : (
                    <div>{activeStep.lineRange}</div>
                  )}
                </div>
                {/* Code body snippet */}
                <div className="flex-1 text-slate-300 text-left select-all whitespace-pre-wrap font-mono">
                  {activeStep.highlightedCode}
                </div>
              </div>
            </div>
            
            {/* Bottom active type status ribbon */}
            <div className="bg-slate-900/60 py-2.5 px-4 flex items-center justify-between border-t border-slate-950/40 select-none shrink-0 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Contextual execution highlight</span>
              </span>
              <span className="font-mono text-indigo-400 font-extrabold uppercase tracking-wide">
                {activeStep.type} node
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Stepping Seek Slider Timeline */}
      <div className="px-6 pb-6 pt-2 select-none">
        <div className="space-y-3">
          
          {/* Progress Seek Bar */}
          <div className="relative h-1.5 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${currentType.color} rounded-full transition-all duration-300`}
              style={{
                width: isPlaying ? `${progress}%` : "0%",
                transition: isPlaying ? "width 0.05s linear" : "width 0.3s ease-out"
              }}
            />
          </div>

          {/* Connected Seek Node Dots representing pipeline steps */}
          <div className="flex items-center justify-between relative pt-1 select-none">
            {/* Connecting line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 border border-dashed border-slate-250 -z-10" />

            {steps.map((step, idx) => {
              const stepConf = typeConfigs[step.type] || typeConfigs.operation;
              const isActive = currentStep === idx;
              
              return (
                <button
                  key={idx}
                  onClick={() => handleStepClick(idx)}
                  className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] border transition-all duration-300 group cursor-pointer relative ${
                    isActive
                      ? `bg-slate-900 border-slate-900 text-white scale-120 ring-4 ring-slate-100 shadow-sm`
                      : `bg-white border-slate-250 text-slate-500 hover:border-slate-400 hover:scale-110 shadow-3xs`
                  }`}
                  title={step.title}
                >
                  <span className="font-bold">{idx + 1}</span>
                  
                  {/* Floating tooltip on hover */}
                  <span className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition duration-200 whitespace-nowrap shadow-md z-30 font-bold border border-slate-800">
                    <span className="mr-1">{stepConf.icon}</span>
                    <span>{step.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}
