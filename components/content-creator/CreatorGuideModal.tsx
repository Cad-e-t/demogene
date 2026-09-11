import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X,
  Mic, 
  Palette, 
  Play, 
} from 'lucide-react';

interface CreatorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatorGuideModal: React.FC<CreatorGuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="bg-[#121214] border border-white/10 rounded-[28px] w-full max-w-xl shadow-2xl relative flex flex-col overflow-hidden my-auto"
          >
            {/* Subtle Ambient Radial Glow */}
            <div className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-28 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />

            {/* Modal Header */}
            <div className="px-6 md:px-8 pt-6 pb-4 border-b border-white/5 flex items-center justify-between relative z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Creator Guide
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slide Content Container */}
            <div className="px-6 md:px-8 py-6 relative z-10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    How to use the studio
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1.5">
                    Turn any script into an engaging video in three fast steps:
                  </p>
                </div>

                {/* 3-Step Guidance Cards */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">01</span>
                        <h4 className="text-base font-bold text-white">Paste Exact Voiceover Script</h4>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        This will be spoken verbatim by the AI narrator. Do <strong className="text-zinc-200">not</strong> include prompts or instructions (like "write a video about").
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">02</span>
                        <h4 className="text-base font-bold text-white">Select Visual Style</h4>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        Pick a style preset (Realistic, Cyberpunk, Cinematic, etc.) and optionally tweak the prompt or voice model.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">03</span>
                        <h4 className="text-base font-bold text-white">Click Generate</h4>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        That's all! Crappik will automatically storyboard scenes, generate imagery, record narration, and align captions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
