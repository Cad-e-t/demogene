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
                @import url('https://fonts.googleapis.com/css2?family=Edu+SA+Beginner:wght@400;700&family=Inter:wght@600&display=swap');
                @import url('https://fonts.cdnfonts.com/css/komika-axis');
                
                /* Pulse Bold - Karaoke Block */
                .sub-pulse-bold {
                    font-family: 'Edu SA Beginner', cursive;
                    color: #FFFF00; /* Yellow */
                    font-weight: 700;
                    text-shadow: 2px 2px 0px #000;
                    animation: pulseBold 1.5s infinite;
                }
                @keyframes pulseBold {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
                }

                /* Glow Focus - Fade Group */
                .sub-glow-focus {
                    font-family: 'Inter', sans-serif;
                    color: white;
                    font-weight: 600;
                    text-shadow: 0 0 10px rgba(0,0,0,0.5);
                    animation: glowFocus 2s infinite alternate;
                }
                @keyframes glowFocus {
                    0% { opacity: 0.8; }
                    100% { opacity: 1; text-shadow: 0 0 15px rgba(255,255,255,0.6); }
                }

                /* Impact Pop - Bounce */
                .sub-impact-pop {
                    font-family: 'Edu SA Beginner', cursive;
                    color: #FFFF00; /* Yellow */
                    font-weight: 700;
                    -webkit-text-stroke: 1px black;
                    text-shadow: 2px 2px 0px #000;
                    animation: impactPop 0.8s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes impactPop {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px) scale(1.1); }
                }

                /* Comic Burst - Action */
                .sub-comic-burst {
                    font-family: 'Komika Axis', sans-serif;
                    color: white;
                    -webkit-text-stroke: 2px black;
                    text-shadow: 3px 3px 0px #000;
                    animation: comicBurst 0.6s infinite alternate;
                }
                @keyframes comicBurst {
                    0% { transform: scale(1) rotate(-2deg); }
                    100% { transform: scale(1.1) rotate(2deg); }
                }
            `}</style>

            {id === 'pulse_bold' && (
                <div className="sub-pulse-bold text-2xl text-center leading-none">
                    Pulse Bold
                </div>
            )}

            {id === 'glow_focus' && (
                <div className="sub-glow-focus text-sm text-center bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
                    Clean & Pro
                </div>
            )}

            {id === 'impact_pop' && (
                <div className="sub-impact-pop text-2xl text-center leading-none">
                    POW!
                </div>
            )}

            {id === 'comic_burst' && (
                <div className="sub-comic-burst text-2xl text-center leading-none uppercase tracking-wider">
                    BOOM!
                </div>
            )}
        </div>
    </div>
  );
};
