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
                /* Architects Daughter */
                .sub-architect {
                    font-family: 'Architects Daughter', cursive;
                    color: #FFFFFF;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                    animation: subFloat 3s infinite ease-in-out;
                }
                @keyframes subFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                /* Chewy */
                .sub-chewy {
                    font-family: 'Chewy', cursive;
                    color: #FFFF00;
                    -webkit-text-stroke: 1px black;
                    text-shadow: 3px 3px 0px #000;
                    animation: subPop 0.8s infinite alternate;
                }
                @keyframes subPop {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }

                /* Komika Hand */
                .sub-komika {
                    font-family: 'Komika Hand', sans-serif;
                    color: white;
                    -webkit-text-stroke: 2px black;
                    text-shadow: 3px 3px 0px #000;
                    animation: subShake 0.5s infinite;
                }
                @keyframes subShake {
                    0% { transform: rotate(-1deg); }
                    50% { transform: rotate(1deg); }
                    100% { transform: rotate(-1deg); }
                }

                /* Griffy */
                .sub-griffy {
                    font-family: 'Griffy', cursive;
                    color: #FF00FF;
                    text-shadow: 0 0 10px rgba(255,0,255,0.8);
                    animation: subGlow 1.5s infinite alternate;
                }
                @keyframes subGlow {
                    0% { opacity: 0.7; }
                    100% { opacity: 1; text-shadow: 0 0 20px rgba(255,0,255,1); }
                }
            `}</style>

            {id === 'pulse_bold' && (
                <div className="sub-architect text-2xl text-center leading-none">
                    Handwritten
                </div>
            )}

            {id === 'glow_focus' && (
                <div className="sub-griffy text-2xl text-center leading-none">
                    Spooky Glow
                </div>
            )}

            {id === 'impact_pop' && (
                <div className="sub-chewy text-2xl text-center leading-none">
                    YUMMY!
                </div>
            )}

            {id === 'comic_burst' && (
                <div className="sub-komika text-2xl text-center leading-none uppercase tracking-wider">
                    POW!
                </div>
            )}
        </div>
    </div>
  );
};
