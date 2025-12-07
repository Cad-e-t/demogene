
import React, { useState } from 'react';
import { VideoCropper } from './components/VideoCropper';
import { ProcessingStatus, CropData, TrimData, AnalysisResult, VoiceOption } from './types';
import { VOICES } from './constants';
import { processVideoRequest } from './api';
// import { createClient } from '@supabase/supabase-js'; // Removed unused simulation

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<ProcessingStatus['step']>('idle');
  
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 1, height: 1 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [voice, setVoice] = useState<VoiceOption>(VOICES[0]);
  
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      setStep('uploading'); 
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setStep('analyzing');

    try {
        const { videoUrl: url, analysis } = await processVideoRequest(
            file, 
            crop,
            trim,
            voice.id, 
            (s) => setStep(s)
        );

        setResult(analysis);
        setFinalVideoUrl(url);

    } catch (e) {
      console.error(e);
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">DemoGen</h1>
          </div>
          <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {step === 'idle' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                Turn Screen Recordings into <span className="text-indigo-400">Polished Demos</span>
              </h2>
              <p className="text-xl text-gray-400">
                AI-powered cropping, zooming, scripting, and voiceovers. 
                Upload raw footage, get a launch-ready video.
              </p>
            </div>

            <label className="group relative cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center gap-3 px-8 py-4 bg-gray-900 ring-1 ring-gray-800 rounded-xl leading-none hover:bg-gray-800 transition">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-semibold text-lg">Upload Video</span>
              </div>
              <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {step !== 'idle' && videoUrl && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column: Editor */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1 overflow-hidden">
                {step === 'uploading' ? (
                   <VideoCropper 
                     videoUrl={videoUrl} 
                     onCropChange={setCrop}
                     onTrimChange={setTrim}
                   />
                ) : (
                    // During processing/result, show either original or placeholder for result
                    <div className="aspect-video bg-black flex items-center justify-center rounded-xl relative overflow-hidden">
                        {finalVideoUrl ? (
                            <video src={finalVideoUrl} controls className="w-full h-full" />
                        ) : (
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                {step !== 'error' && <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
                                <p className="text-indigo-300 font-medium">
                                    {step === 'analyzing' && 'Analyzing visual content...'}
                                    {step === 'generating_audio' && 'Generating AI Voiceover...'}
                                    {step === 'rendering' && 'Rendering final video...'}
                                    {step === 'error' && 'Processing Failed'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
              </div>
              
              {/* Script Preview (Only after analysis) */}
              {result && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Generated Script
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {result.script.script_lines.map((line, idx) => (
                            <div key={idx} className="flex gap-4 p-3 rounded-lg hover:bg-gray-800 transition">
                                <span className={`text-xs font-bold uppercase tracking-wider py-1 px-2 rounded h-fit ${
                                    line.type === 'hook' ? 'bg-purple-500/20 text-purple-300' :
                                    line.type === 'cta' ? 'bg-green-500/20 text-green-300' :
                                    'bg-blue-500/20 text-blue-300'
                                }`}>
                                    {line.type}
                                </span>
                                <p className="text-gray-300 leading-relaxed">{line.narration}</p>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>

            {/* Right Column: Settings & Actions */}
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-24">
                <h3 className="font-semibold text-lg mb-6">Configuration</h3>
                
                {/* Voice Selector */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Narrator Voice</label>
                  <div className="grid grid-cols-1 gap-2">
                    {VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVoice(v)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                          voice.id === v.id 
                            ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                            : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs opacity-60">{v.gender}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Processing Status Steps */}
                {step !== 'uploading' && step !== 'error' && (
                    <div className="mb-8 space-y-3">
                        <div className={`flex items-center gap-3 ${step === 'analyzing' ? 'text-indigo-400' : 'text-green-500'}`}>
                            {step === 'analyzing' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : "✓"}
                            <span className="text-sm font-medium">Analyzing Video (Gemini)</span>
                        </div>
                         <div className={`flex items-center gap-3 ${step === 'generating_audio' ? 'text-indigo-400' : (['rendering', 'complete'].includes(step) ? 'text-green-500' : 'text-gray-600')}`}>
                            {step === 'generating_audio' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (['rendering', 'complete'].includes(step) ? "✓" : "-")}
                            <span className="text-sm font-medium">Generating Voiceover</span>
                        </div>
                        <div className={`flex items-center gap-3 ${step === 'rendering' ? 'text-indigo-400' : (step === 'complete' ? 'text-green-500' : 'text-gray-600')}`}>
                            {step === 'rendering' ? <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/> : (step === 'complete' ? "✓" : "-")}
                            <span className="text-sm font-medium">Visual Processing (FFmpeg)</span>
                        </div>
                    </div>
                )}
                
                 {step === 'error' && (
                    <div className="mb-8 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200">
                        Error processing video. Please try again.
                    </div>
                 )}

                {/* Primary Action */}
                {step === 'uploading' && (
                    <button 
                        onClick={handleGenerate}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95"
                    >
                        Generate Demo Video
                    </button>
                )}
                
                {step === 'complete' && (
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition"
                    >
                        Start New Project
                    </button>
                )}
                
                {step === 'error' && (
                    <button 
                        onClick={() => setStep('uploading')}
                        className="w-full py-3 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition"
                    >
                        Try Again
                    </button>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
