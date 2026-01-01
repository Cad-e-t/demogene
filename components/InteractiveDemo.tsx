import React, { useState, useEffect } from 'react';
import { VideoCropper } from './VideoCropper';
import { VOICES, BACKGROUNDS } from '../constants';
import { INTERACTIVE_DEMO_INPUT, INTERACTIVE_DEMO_OUTPUT } from '../assets';

interface InteractiveDemoProps {
  onClose: () => void;
  onFinish: (videoUrl: string) => void;
}

export const InteractiveDemo: React.FC<InteractiveDemoProps> = ({ onClose, onFinish }) => {
  const [step, setStep] = useState<'config' | 'processing'>('config');
  const [processingStep, setProcessingStep] = useState<'analyzing' | 'generating_audio' | 'rendering'>('analyzing');

  const demoConfig = {
    appName: "MonkeyFace",
    appDescription: "MonkeyFace is an AI video creation tool. You can create saas demos and video explainers with AI presenters.",
    voice: VOICES[0],
    background: BACKGROUNDS[0]
  };

  useEffect(() => {
    if (step === 'processing') {
      const timer1 = setTimeout(() => setProcessingStep('generating_audio'), 2000);
      const timer2 = setTimeout(() => setProcessingStep('rendering'), 4000);
      const timer3 = setTimeout(() => onFinish(INTERACTIVE_DEMO_OUTPUT), 7000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [step, onFinish]);

  if (step === 'processing') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2 animate-pulse uppercase tracking-widest">
          {processingStep === 'analyzing' ? 'Analyzing Screen Actions...' : 
           processingStep === 'generating_audio' ? 'Generating Voiceover...' : 'Rendering Final Demo...'}
        </h2>
        <p className="text-gray-400 font-medium">This is a simulated demo to show you how ProductCam works.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans overflow-hidden animate-fade-in">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-20">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Exit Demo
        </button>
        <span className="text-xs font-black text-green-600 uppercase tracking-widest">Interactive Demo</span>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="hidden md:flex h-14 border-b border-gray-200 items-center justify-between px-6 bg-white flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1" title="Exit Demo">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-sm font-bold text-gray-900 truncate">Demo Recording: MonkeyFace Walkthrough</span>
          </div>
          <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest animate-pulse">
            Interactive Demo Mode
          </div>
        </div>

        <div className="flex-1 bg-gray-50/80 relative flex flex-col min-h-0 items-center justify-center p-8">
          <div className="relative w-full h-full flex flex-col items-center">
            <div className="flex-1 w-full flex items-center justify-center min-h-0 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden relative">
              <VideoCropper 
                videoUrl={INTERACTIVE_DEMO_INPUT}
                onCropChange={() => {}}
                onTrimChange={() => {}}
                onAdvancedEdit={() => {}}
                hideTimeline={true}
              />
            </div>
            <div className="py-6 text-center">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Simulation Only</p>
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-400 rounded-full font-bold text-sm border border-gray-200 cursor-not-allowed">
                Removing unwanted parts disabled in demo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Sidebar */}
      <div className="w-full md:w-80 md:border-l border-gray-200 bg-white flex flex-col z-10 flex-shrink-0">
        <div className="h-14 border-b border-gray-200 flex items-center px-6 flex-shrink-0 bg-gray-50/50">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Pre-configured Demo</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4 opacity-75">
            <div className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Voice</span>
              <span className="text-sm font-bold">{demoConfig.voice.name}</span>
            </div>
            <div className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">App Name</span>
              <span className="text-sm font-bold">{demoConfig.appName}</span>
            </div>
            <div className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</span>
              <span className="text-sm font-medium line-clamp-3">{demoConfig.appDescription}</span>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs font-bold text-green-700 leading-relaxed">
              In the real app, you can customize everything from the script rules to the narrator's voice.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => setStep('processing')}
            className="w-full py-5 bg-green-600 text-white text-lg font-black rounded-xl hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 transform active:scale-[0.98] uppercase tracking-tighter"
          >
            Generate Demo
          </button>
        </div>
      </div>
    </div>
  );
};
