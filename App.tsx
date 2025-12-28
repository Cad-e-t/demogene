
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { VideoGallery } from './components/VideoGallery';
import { VideoModal } from './components/VideoModal';
import { BlogView } from './components/BlogView';
import { BlogPostView } from './components/BlogPostView';

import { CropData, TrimData, VoiceOption, VideoProject, TimeRange } from './types';
import { VOICES } from './constants';
import { processVideoRequest, createCheckoutSession, deleteVideo } from './frontend-api';
import { DEFAULT_SCRIPT_RULES, DEFAULT_TTS_STYLE } from './scriptStyles';

// Custom Minimal Router Hook
const useHashPath = () => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (hash.startsWith('#/blog/')) {
    return { view: 'blog-post', slug: hash.replace('#/blog/', '') };
  }
  if (hash === '#/blog') return { view: 'blog', slug: null };
  if (hash === '#/videos') return { view: 'videos', slug: null };
  return { view: 'home', slug: null };
};

interface UserProfile {
    id: string;
    credits: number;
}

const PRODUCT_10_DEMOS = "pdt_2LwDVRweVv9iX22U5RDSW"; 

const navigateTo = (path: string) => {
  window.location.hash = path;
};

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

const AuthSelectionModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: (p: 'twitter' | 'google') => void }) => (
  <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-[32px] p-10 md:p-16 w-full max-w-lg relative shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      
      <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-12 uppercase">Sign In</h2>
      
      <div className="flex items-center gap-8 md:gap-12">
         {/* X Button with Edges */}
         <button onClick={() => onSelect('twitter')} className="group flex flex-col items-center gap-4 transition-transform hover:scale-[1.02]">
             <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-gray-900 text-white rounded-2xl border-2 border-black shadow-[0_6px_0_0_#000] active:shadow-none active:translate-y-1 transition-all">
                 <XIcon className="w-10 h-10 md:w-12 md:h-12" />
             </div>
             <span className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 group-hover:text-black">X / Twitter</span>
         </button>

         {/* Separator */}
         <div className="flex flex-col items-center gap-3">
             <div className="w-px h-8 bg-gray-100"></div>
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">OR</span>
             <div className="w-px h-8 bg-gray-100"></div>
         </div>

         {/* Google Button with Edges */}
         <button onClick={() => onSelect('google')} className="group flex flex-col items-center gap-4 transition-transform hover:scale-[1.02]">
             <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white border-2 border-black text-gray-900 rounded-2xl shadow-[0_6px_0_0_#000] active:shadow-none active:translate-y-1 transition-all">
                 <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                 </svg>
             </div>
             <span className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 group-hover:text-black">Google</span>
         </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthSelection, setShowAuthSelection] = useState(false);
  const [isForcedAuth, setIsForcedAuth] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showFailureNotification, setShowFailureNotification] = useState(false);
  
  // URL-based Navigation
  const route = useHashPath();
  const currentView = route.view;
  
  // Home View State (Lifted Up)
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 1, height: 1 });
  const [trim, setTrim] = useState<TrimData>({ start: 0, end: 0 });
  const [voice, setVoice] = useState<VoiceOption>(VOICES[0]);
  const [appName, setAppName] = useState<string>("");
  const [appDescription, setAppDescription] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Gallery State
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoProject | null>(null);

  // --- Auth & Init ---
  useEffect(() => {
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
          setShowAuthSelection(false);
          setIsForcedAuth(false);
          fetchProfile(session.user.id);
      } else {
          setProfile(null);
      }
    });

    const params = new URLSearchParams(window.location.search);
    const paymentStatusIndicator = params.get('payment_status');
    const outcome = params.get('status');

    if (paymentStatusIndicator === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (outcome === 'succeeded') {
            setShowSuccessNotification(true);
        } else if (outcome === 'failed') {
            setShowFailureNotification(true);
        } else {
            setShowSuccessNotification(true);
        }
    }
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) setProfile(data);
      else if (error?.code === 'PGRST116') setProfile({ id: userId, credits: 0 });
  };

  const handleLogin = () => {
    setShowAuthSelection(true);
  };

  const handleProviderLogin = async (provider: 'twitter' | 'google') => {
    try { 
        await (supabase.auth as any).signInWithOAuth({ provider }); 
    } 
    catch (error) { 
        console.error(`${provider} login failed:`, error); 
    }
  };

  const handleLogout = async () => {
      await (supabase.auth as any).signOut();
      navigateTo('#/');
      setVideos([]);
      setProfile(null);
  };

  // --- Video Logic ---
  const fetchVideos = async () => {
    if (!session?.user) return;
    try {
        const { data, error } = await supabase.from('videos').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
        if (error) throw error;
        setVideos(prev => {
            const processing = prev.filter(v => v.status === 'processing');
            const existingIds = new Set(processing.map(v => v.id));
            const newVideos = (data || []).filter(v => !existingIds.has(v.id));
            return [...processing, ...newVideos] as VideoProject[];
        });
    } catch(e) { console.error("Failed to fetch videos", e); }
  };

  useEffect(() => {
    if (currentView === 'videos' && session) fetchVideos();
  }, [currentView, session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const f = e.target.files[0];
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      setErrorMessage(null);
      setCrop({ x: 0, y: 0, width: 1, height: 1 });
      setTrim({ start: 0, end: 0 });
      setAppName("");
      setAppDescription("");
      
      if (!session) setIsForcedAuth(true);
    }
  };

  const handleClearFile = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setErrorMessage(null);
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
    setTrim({ start: 0, end: 0 });
    setAppName("");
    setAppDescription("");
    setIsForcedAuth(false);
  };

  const handleGenerate = async (segments?: TimeRange[]) => {
      if (!file || !session) return;
      
      const effectiveDuration = segments 
        ? segments.reduce((acc, s) => acc + (s.end - s.start), 0)
        : trim.end - trim.start;

      if (effectiveDuration > 180) {
          setErrorMessage("Video selection must be 3 minutes or less. Please trim.");
          return;
      }
      if (voice.id !== 'voiceless' && (!appDescription.trim() || !appName.trim())) {
          setErrorMessage("Please provide the app name and a short description for the script.");
          return;
      }
      if (profile && profile.credits < 1) {
          setErrorMessage("Insufficient credits. Please purchase a pack.");
          return;
      }

      setErrorMessage(null);

      // NAVIGATE FIRST to prevent duplicate clicks and ensure UI transition
      navigateTo('#/videos');

      const tempId = uuidv4();
      const optimisticVideo: VideoProject = {
          id: tempId,
          title: file.name,
          final_video_url: null,
          created_at: new Date().toISOString(),
          status: 'processing',
          processingStep: 'analyzing',
          voice_id: voice.id,
          user_id: session.user.id,
          input_video_url: null
      };

      setVideos(prev => [optimisticVideo, ...prev]);

      try {
          const { videoUrl: resultUrl, analysis } = await processVideoRequest(
              file, crop, trim, voice.id, session.user.id,
              (step) => {
                  setVideos(prev => prev.map(v => v.id === tempId ? { ...v, processingStep: step } : v));
              },
              appName,
              appDescription,
              DEFAULT_SCRIPT_RULES,
              DEFAULT_TTS_STYLE,
              segments 
          );
          
          const completedVideo: VideoProject = {
              ...optimisticVideo,
              status: 'completed',
              final_video_url: resultUrl,
              analysis_result: analysis
          };

          setVideos(prev => prev.map(v => v.id === tempId ? completedVideo : v));
          fetchProfile(session.user.id);
          setSelectedVideo(completedVideo);

      } catch (e: any) {
          console.error(e);
          setVideos(prev => prev.map(v => v.id === tempId ? { 
              ...v, 
              status: 'failed', 
              errorMessage: e.message || "Unknown Error" 
          } : v));
      }
  };

  const handlePurchase = async () => {
      try {
          const { checkout_url } = await createCheckoutSession(PRODUCT_10_DEMOS);
          window.location.href = checkout_url;
      } catch (e) {
          console.error(e);
          alert("Failed to initiate checkout");
      }
  };

  const handleDeleteVideo = async (video: VideoProject) => {
      try {
          await deleteVideo(video);
          setVideos(prev => prev.filter(v => v.id !== video.id));
      } catch (e: any) {
          console.error("Delete failed:", e);
          alert("Failed to delete video: " + (e.message || "Unknown error"));
      }
  };

  // Hide sidebar if we are on blog pages or not logged in
  const isPublicReaderView = currentView === 'blog' || currentView === 'blog-post';
  const showSidebar = session && !isPublicReaderView;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      
      {showSidebar && (
          <Sidebar 
            currentView={currentView as any} 
            setCurrentView={(v) => navigateTo(`#/${v}`)} 
            handleLogout={handleLogout} 
          />
      )}

      <main className={`transition-all duration-300 min-h-screen ${showSidebar ? 'md:ml-14 mt-14 md:mt-0' : ''}`}>
          
          {currentView === 'home' && (
              <HomeView 
                  file={file}
                  videoUrl={videoUrl}
                  session={session}
                  profile={profile}
                  crop={crop} setCrop={setCrop}
                  trim={trim} setTrim={setTrim}
                  voice={voice} setVoice={setVoice}
                  appName={appName} setAppName={setAppName}
                  appDescription={appDescription} setAppDescription={setAppDescription}
                  errorMessage={errorMessage}
                  onFileChange={handleFileChange}
                  onClearFile={handleClearFile}
                  onGenerate={handleGenerate}
                  onPurchase={handlePurchase}
                  showAuthModal={isForcedAuth}
                  handleLogin={handleLogin}
                  showSuccessNotification={showSuccessNotification}
                  setShowSuccessNotification={setShowSuccessNotification}
                  showFailureNotification={showFailureNotification}
                  setShowFailureNotification={setShowFailureNotification}
              />
          )}

          {currentView === 'blog' && <BlogView />}
          {currentView === 'blog-post' && <BlogPostView slug={route.slug || ''} />}

          {currentView === 'videos' && (
              <VideoGallery 
                  videos={videos} 
                  onSelectVideo={setSelectedVideo}
                  onDeleteVideo={handleDeleteVideo}
                  fetchVideos={fetchVideos}
              />
          )}
      </main>

      {selectedVideo && (
          <VideoModal 
            video={selectedVideo} 
            onClose={() => setSelectedVideo(null)} 
          />
      )}

      {showAuthSelection && (
          <AuthSelectionModal 
            onClose={() => setShowAuthSelection(false)} 
            onSelect={handleProviderLogin} 
          />
      )}

    </div>
  );
}
