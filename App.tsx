import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { VideoGallery } from './components/VideoGallery';
import { VideoModal } from './components/VideoModal';

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

  // Return derived view
  if (hash === '#/videos') return 'videos';
  return 'home';
};

interface UserProfile {
    id: string;
    credits: number;
}

const PRODUCT_10_DEMOS = "pdt_2LwDVRweVv9iX22U5RDSW"; 

const navigateTo = (path: 'home' | 'videos') => {
  window.location.hash = path === 'home' ? '#/' : '#/videos';
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showFailureNotification, setShowFailureNotification] = useState(false);
  
  // URL-based Navigation
  const currentView = useHashPath();
  
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
          setShowAuthModal(false);
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

  const handleLogin = async () => {
    try { await (supabase.auth as any).signInWithOAuth({ provider: 'twitter' }); } 
    catch (error) { console.error("Login failed:", error); }
  };

  const handleLogout = async () => {
      await (supabase.auth as any).signOut();
      navigateTo('home');
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
      
      if (!session) setShowAuthModal(true);
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
      navigateTo('videos');

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      
      {session && (
          <Sidebar 
            currentView={currentView} 
            setCurrentView={navigateTo} 
            handleLogout={handleLogout} 
          />
      )}

      <main className={`transition-all duration-300 min-h-screen ${session ? 'md:ml-14 mt-14 md:mt-0' : ''}`}>
          
          <div className={currentView === 'home' ? 'block' : 'hidden'}>
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
                  showAuthModal={showAuthModal}
                  handleLogin={handleLogin}
                  showSuccessNotification={showSuccessNotification}
                  setShowSuccessNotification={setShowSuccessNotification}
                  showFailureNotification={showFailureNotification}
                  setShowFailureNotification={setShowFailureNotification}
              />
          </div>

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

    </div>
  );
}


