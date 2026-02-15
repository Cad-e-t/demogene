
import React from 'react';

export const SubtitlePreview = ({ id }: { id: string }) => {
  if (id === 'none') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100/50">
        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">No Subtitles</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-900 overflow-hidden rounded-md isolate">
        {/* Background Gradient to simulate video content */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 via-purple-900/40 to-black z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 z-0"></div>

        {/* Animation Container */}
        <div className="relative z-10 w-full h-full flex items-end justify-center pb-3">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Allura&family=Fredoka+One&family=Inter:wght@600&display=swap');
                
                /* Pulse Bold - Karaoke Block */
                .sub-pulse-bold {
                    font-family: 'Allura', cursive;
                    color: #FFFF00; /* Yellow */
                    text-shadow: 2px 2px 0px #000;
                    animation: pulseBold 1.5s infinite;
                }
                @keyframes pulseBold {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); text-shadow: 2px 2px 10px rgba(255,255,0,0.5); }
                }

                /* Glow Focus - Fade Group */
                .sub-glow-focus {
                    font-family: 'Inter', sans-serif;
                    color: white;
                    text-shadow: 0 0 10px rgba(0,0,0,0.5);
                    animation: glowFocus 2s infinite alternate;
                }
                @keyframes glowFocus {
                    0% { opacity: 0.6; transform: translateY(1px); }
                    100% { opacity: 1; transform: translateY(0); text-shadow: 0 0 20px rgba(255,255,255,0.8); }
                }

                /* Impact Pop - Bounce */
                .sub-impact-pop {
                    font-family: 'Fredoka One', cursive;
                    color: #00FFFF; /* Cyan */
                    -webkit-text-stroke: 1px black;
                    text-shadow: 2px 2px 0px #000;
                    animation: impactPop 0.8s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes impactPop {
                    0%, 100% { transform: translateY(0); color: #00FFFF; }
                    50% { transform: translateY(-2px) scale(1.05); color: #FFA500; }
                }
            `}</style>

            {id === 'pulse_bold' && (
                <div className="sub-pulse-bold text-xl text-center leading-none">
                    Pulse Bold
                </div>
            )}

            {id === 'glow_focus' && (
                <div className="sub-glow-focus text-sm font-semibold text-center bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                    Clean & Pro
                </div>
            )}

            {id === 'impact_pop' && (
                <div className="sub-impact-pop text-lg text-center uppercase tracking-wide leading-none">
                    POW!
                </div>
            )}
        </div>
    </div>
  );
};
