import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Smartphone, 
  Monitor, 
  Layers, 
  Sparkles, 
  Flame, 
  Award, 
  Compass, 
  Mic, 
  Palette, 
  Play, 
  Check, 
  ArrowRight, 
  Loader2,
  Clapperboard,
  Video
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import confetti from 'canvas-confetti';

interface OnboardingProps {
  session: any;
  onComplete: (answers?: {
    platform: PlatformOption;
    contentType: ContentTypeOption;
    experienceLevel: ExperienceOption;
  }) => void;
}

type PlatformOption = 'tiktok' | 'youtube' | 'both';
type ContentTypeOption = 'shorts' | 'long_form';
type ExperienceOption = 'first_time' | 'intermediate' | 'expert';

export const Onboarding: React.FC<OnboardingProps> = ({ session, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [platform, setPlatform] = useState<PlatformOption>('tiktok');
  const [contentType, setContentType] = useState<ContentTypeOption>('shorts');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceOption>('first_time');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (currentSlide === 0 || currentSlide === 4) {
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#EAB308', '#F59E0B', '#D97706']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#EAB308', '#F59E0B', '#D97706']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [currentSlide]);

  const userId = session?.user?.id;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Upsert into onboarding_data table
      if (userId) {
        try {
          const { data: existingRecord, error: fetchError } = await supabase
            .from('onboarding_data')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (fetchError) {
            console.warn('Error checking existing onboarding record:', fetchError);
          }

          const payload = {
            platform,
            content_type: contentType,
            experience_level: experienceLevel,
            has_completed_onboarding: true,
            answers: {
              platform,
              content_type: contentType,
              experience_level: experienceLevel,
              completed_at: new Date().toISOString()
            }
          };

          if (existingRecord) {
            const { error: updateError } = await supabase
              .from('onboarding_data')
              .update(payload)
              .eq('user_id', userId);
              
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('onboarding_data')
              .insert({
                user_id: userId,
                ...payload
              });
              
            if (insertError) throw insertError;
          }
        } catch (dbErr) {
          console.warn('Could not insert/update onboarding_data:', dbErr);
        }
      }
    } catch (e) {
      console.error('Error completing onboarding:', e);
    } finally {
      setIsSubmitting(false);
      onComplete({ platform, contentType, experienceLevel });
    }
  };

  const nextSlide = () => {
    if (currentSlide < 4) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-[#121214] border border-white/10 rounded-[28px] w-full max-w-2xl shadow-2xl relative flex flex-col overflow-hidden my-auto"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />

        {/* Modal Header */}
        <div className="px-6 md:px-8 pt-6 pb-4 border-b border-white/5 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
          </div>

          {/* Stepper Progress Dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((stepIdx) => (
              <div
                key={stepIdx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  stepIdx === currentSlide
                    ? 'w-6 bg-yellow-500'
                    : stepIdx < currentSlide
                    ? 'w-2.5 bg-yellow-500/50'
                    : 'w-2.5 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slide Content Container */}
        <div className="px-6 md:px-8 py-6 relative z-10 min-h-[380px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* Slide 0: Welcome */}
            {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center text-center h-full space-y-6 my-auto py-12"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 p-0.5 shadow-2xl shadow-yellow-500/20">
                  <div className="w-full h-full bg-[#121214] rounded-[22px] flex items-center justify-center">
                    <Clapperboard className="w-10 h-10 text-yellow-500" strokeWidth={2} />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 tracking-tight leading-tight pb-2">
                  Welcome To Crappik, Creator!
                </h1>
              </motion.div>
            )}

            {/* Slide 1: Platform Selection */}
            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Which platform will you be creating for?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* TikTok Card */}
                  <button
                    type="button"
                    onClick={() => setPlatform('tiktok')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      platform === 'tiktok'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        platform === 'tiktok' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      {platform === 'tiktok' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">TikTok</h3>
                    </div>
                  </button>

                  {/* YouTube Card */}
                  <button
                    type="button"
                    onClick={() => setPlatform('youtube')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      platform === 'youtube'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        platform === 'youtube' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      {platform === 'youtube' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">YouTube</h3>
                    </div>
                  </button>

                  {/* Both Card */}
                  <button
                    type="button"
                    onClick={() => setPlatform('both')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      platform === 'both'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        platform === 'both' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      {platform === 'both' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Both</h3>
                     
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Slide 2: Content Format */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    What type of content do you want to create?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shorts Card */}
                  <button
                    type="button"
                    onClick={() => setContentType('shorts')}
                    className={`text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      contentType === 'shorts'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                        contentType === 'shorts' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-semibold">
                        9:16
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">Shorts & Reels</h3>
                        {contentType === 'shorts' && (
                          <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Long Form Card */}
                  <button
                    type="button"
                    onClick={() => setContentType('long_form')}
                    className={`text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      contentType === 'long_form'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                        contentType === 'long_form' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Monitor className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-semibold">
                        16:9
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">Long-Form Videos</h3>
                        {contentType === 'long_form' && (
                          <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Slide 3: Experience Level */}
            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    How much do you know about creating faceless content?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* First Time */}
                  <button
                    type="button"
                    onClick={() => setExperienceLevel('first_time')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      experienceLevel === 'first_time'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        experienceLevel === 'first_time' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Compass className="w-5 h-5" />
                      </div>
                      {experienceLevel === 'first_time' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">My First Time</h3>
                    </div>
                  </button>

                  {/* Intermediate */}
                  <button
                    type="button"
                    onClick={() => setExperienceLevel('intermediate')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      experienceLevel === 'intermediate'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        experienceLevel === 'intermediate' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      {experienceLevel === 'intermediate' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Intermediate</h3>
                    </div>
                  </button>

                  {/* Expert */}
                  <button
                    type="button"
                    onClick={() => setExperienceLevel('expert')}
                    className={`text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                      experienceLevel === 'expert'
                        ? 'bg-yellow-500/10 border-yellow-500/50 ring-1 ring-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                        experienceLevel === 'expert' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-300 group-hover:text-white'
                      }`}>
                        <Award className="w-5 h-5" />
                      </div>
                      {experienceLevel === 'expert' && (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Expert</h3>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Slide 4: Personalized Greeting & App Guidance */}
            {currentSlide === 4 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Dynamic Welcome Heading */}
                <div>
                  {experienceLevel === 'first_time' ? (
                    <div className="space-y-1">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                        You're in great hands. Let's create your first video!
                      </h2>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                        Let's get you straight to the studio!
                      </h2>
                    </div>
                  )}
                </div>

                {/* 3-Step Guidance Cards */}
                <div className="space-y-2.5">
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-yellow-400">01</span>
                        <h4 className="text-sm font-bold text-white">Paste Exact Voiceover Script</h4>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                     This will be spoken verbatim by the AI narrator. Do <strong className="text-zinc-200">not</strong> include prompts or instructions (like "write a video about").
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-yellow-400">02</span>
                        <h4 className="text-sm font-bold text-white">Select Visual Style</h4>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                         (Realistic, Cyberpunk, Cinematic, etc.) and optionally tweak the prompt or voice model.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
                      <Play className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-yellow-400">03</span>
                        <h4 className="text-sm font-bold text-white">Click Generate</h4>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        That's all! Crappik will automatically storyboard scenes, generate imagery, record narration, and align captions.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Footer Controls */}
          <div className="pt-6 mt-4 border-t border-white/10 flex items-center justify-between">
            {currentSlide > 0 ? (
              <button
                type="button"
                onClick={prevSlide}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={nextSlide}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-98 text-black text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Studio...</span>
                </>
              ) : currentSlide === 4 ? (
                <>
                  <span>Enter Studio & Start Creating</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
