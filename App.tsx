import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
// Fixed: Use type import for Session to handle cases where it's exported as a type
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

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

interface UserProfile {
    id: string;
    credits: number;
}

const PRODUCT_10_DEMOS = "pdt_2LwDVRweVv9iX22U5RDSW"; 

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  
  // Navigation
  const [currentView, setCurrentView] = useState<'home' | 'videos'>('home');
  
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
    // Fixed: Cast auth to any to bypass typing errors if getSession is not correctly picked up from types
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    // Fixed: Cast auth to any to bypass typing errors for onAuthStateChange
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
    if (params.get('payment_status') === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowSuccessNotification(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) setProfile(data);
      else if (error?.code === 'PGRST116') setProfile({ id: userId, credits: 0 });
  };

  const handleLogin = async () => {
    // Fixed: Cast auth to any to bypass typing errors for signInWithOAuth
    try { await (supabase.auth as any).signInWithOAuth({ provider: 'twitter' }); } 
    catch (error) { console.error("Login failed:", error); }
  };

  const handleLogout = async () => {
      // Fixed: Cast auth to any to bypass typing errors for signOut
      await (supabase.auth as any).signOut();
      setCurrentView('home');
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
            // Merge but deduplicate if necessary
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

  // Accepting optional segments if advanced editor was used
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
          user_id: session.user.id
      };

      setVideos(prev => [optimisticVideo, ...prev]);
      setCurrentView('videos');

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
              segments // Pass new segments param
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
            setCurrentView={setCurrentView} 
            handleLogout={handleLogout} 
          />
      )}

      {/* Responsive Margin: Left on Desktop, Top on Mobile */}
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