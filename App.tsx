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
import { PricingView } from './components/PricingView';
import { FeaturesPage } from './components/FeaturesPage';
import { AboutPage } from './components/AboutPage';
import { PricingPageSEO } from './components/PricingPageSEO';

import { CropData, TrimData, VoiceOption, VideoProject, TimeRange, BackgroundOption } from './types';
import { VOICES, BACKGROUNDS } from './constants';
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
  if (hash === '#/pricing') return { view: 'pricing', slug: null };
  if (hash === '#/features') return { view: 'features', slug: null };
  if (hash === '#/about') return { view: 'about', slug: null };
  if (hash === '#/pricing-details') return { view: 'pricing-details', slug: null };
  return { view: 'home', slug: null };
};

interface UserProfile {
    id: string;
    credits: number;
    dodo_customer_id?: string;
}

const PRODUCT_10_DEMOS = "pdt_2LwDVRweVv9iX22U5RDSW"; 

const navigateTo = (path: string) => {
  window.location.hash = path;
};

const AuthSelectionModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: (p: 'google') => void }) => (
  <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-[32px] p-10 md:p-16 w-full max-w-md relative shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      
      <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter mb-10 uppercase text-center">Continue To ProductCam</h2>
      
      <button onClick={() => onSelect('google')} className="w-full group flex items-center justify-center gap-4 py-4 px-6 bg-white border-2 border-black text-gray-900 rounded-2xl shadow-[0_6px_0_0_#000] active:shadow-none active:translate-y-1 transition-all">
          <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24">
             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-lg md:text-xl font-black tracking-tight">Continue with Google</span>
      </button>
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
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>(BACKGROUNDS);
  
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

    // Fetch backgrounds from Supabase Storage
    const loadBackgrounds = async () => {
        try {
            const { data, error } = await (supabase.storage as any).from('uploads').list('backgrounds');
            if (data && !error) {
                const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ceccojjvzimljcdltjxy.supabase.co';
                const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/backgrounds/`;
                
                const mainFiles = data.filter((f: any) => !f.name.includes('_thumb') && f.name !== '.emptyFolderPlaceholder');
                const fetched = mainFiles.map((f: any) => {
                    const id = f.name;
                    const name = f.name.split('.')[0].replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                    const thumbName = f.name.replace(/(\.[^.]+)$/, '_thumb$1');
                    const hasThumb = data.some((d: any) => d.name === thumbName);
                    return {
                        id,
                        name,
                        url: baseUrl + id,
                        thumbnail: hasThumb ? baseUrl + thumbName : baseUrl + id
                    };
                });
                setBackgroundOptions([BACKGROUNDS[0], ...fetched]);
            }
        } catch (e) {
            console.error("Failed to load backgrounds from storage", e);
        }
    };
    loadBackgrounds();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) setProfile(data);
      else if (error?.code === 'PGRST116') setProfile({ id: userId, credits: 0 });
  };

  // --- Canonical Tag Sync ---
  useEffect(() => {
    const baseUrl = "https://productcam.site/";
    let path = "";
    if (currentView === 'blog') path = "#/blog";
    else if (currentView === 'blog-post' && route.slug) path = `#/blog/${route.slug}`;
    else if (currentView === 'pricing') path = "#/pricing";
    else if (currentView === 'videos') path = "#/videos";
    else if (currentView === 'features') path = "#/features";
    else if (currentView === 'about') path = "#/about";
    else if (currentView === 'pricing-details') path = "#/pricing-details";
    
    const canonicalUrl = baseUrl + path;
    
    let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalUrl);
  }, [currentView, route.slug]);

  const handleLogin = () => {
    setShowAuthSelection(true);
  };

  const handleProviderLogin = async (provider: 'google') => {
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
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', session.user.id)
            .neq('status', 'uploaded') // Only fetch projects, not raw uploads
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setVideos(prev => {
            const localProcessing = prev.filter(v => v.status === 'processing');
            const finalVideos: VideoProject[] = [];
            const processedIds = new Set<string>();

            // 1. Process DB Videos (Source of Truth)
            const dbVideos = (data || []) as VideoProject[];
            
            for (const dbVid of dbVideos) {
                const localVid = localProcessing.find(lv => lv.id === dbVid.id);
                
                if (localVid) {
                    // We have a local optimistic version. Check status.
                    // If DB is still processing, keep local (to show steps like 'analyzing').
                    // If DB is completed/failed, accept DB version (it finished!).
                    if (dbVid.status === 'processing' || dbVid.status === 'uploaded') {
                        finalVideos.push(localVid);
                    } else {
                        finalVideos.push(dbVid);
                    }
                } else {
                    // No local version, take DB version.
                    finalVideos.push(dbVid);
                }
                processedIds.add(dbVid.id);
            }

            // 2. Add any local processing videos that haven't appeared in DB yet
            for (const localVid of localProcessing) {
                if (!processedIds.has(localVid.id)) {
                    finalVideos.push(localVid);
                }
            }
            
            // Sort by creation time
            return finalVideos.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const handleGenerate = async (videoId: string, segments?: TimeRange[], backgroundId?: string, disableZoom?: boolean) => {
      if (!session) return;
      
      const effectiveDuration = segments 
        ? segments.reduce((acc, s) => acc + (s.end - s.start), 0)
        : trim.end - trim.start;

      if (effectiveDuration > 300) {
          setErrorMessage("The video's duration exceeds the 5-minute limit. Please shorten your recording or remove sections.");
          return;
      }
      if (voice.id !== 'voiceless' && (!appDescription.trim() || !appName.trim())) {
          setErrorMessage("Please provide the app name and a short description so the AI can write the script.");
          return;
      }
      if (profile && profile.credits < 1) {
          setErrorMessage("You don't have enough credits. Please purchase a pack to continue.");
          return;
      }

      setErrorMessage(null);

      // NAVIGATE FIRST to prevent duplicate clicks and ensure UI transition
      navigateTo('#/videos');

      // Find original title for better UX
      const sourceVideo = videos.find(v => v.id === videoId);
      const sourceTitle = sourceVideo ? sourceVideo.title : "New Project";
      // Ensure we don't double append "(Demo)"
      const demoTitle = sourceTitle.endsWith('(Demo)') ? sourceTitle : `${sourceTitle} (Demo)`;
      
      // Track the ID to update status updates correctly
      let processingId: string | null = null;

      try {
          const { videoId: finalId, videoUrl: resultUrl, analysis } = await processVideoRequest(
              videoId,
              segments,
              crop, 
              trim, 
              voice.id, 
              backgroundId || 'none', 
              session.user.id,
              (step) => {
                  if (processingId) {
                       setVideos(prev => prev.map(v => v.id === processingId ? { ...v, processingStep: step } : v));
                  }
              },
              appName,
              appDescription,
              DEFAULT_SCRIPT_RULES,
              DEFAULT_TTS_STYLE,
              disableZoom,
              (newId) => {
                  processingId = newId;
                  const optimisticVideo: VideoProject = {
                      id: newId,
                      title: demoTitle,
                      final_video_url: null,
                      created_at: new Date().toISOString(),
                      status: 'processing',
                      processingStep: 'analyzing',
                      voice_id: voice.id,
                      user_id: session.user.id,
                      input_video_url: null
                  };
                  // Add new optimistic video to list, keeping the source video
                  setVideos(prev => [optimisticVideo, ...prev]);
              }
          );
          
          const completedVideo: VideoProject = {
              id: finalId,
              title: demoTitle,
              final_video_url: resultUrl,
              created_at: new Date().toISOString(),
              status: 'completed',
              voice_id: voice.id,
              user_id: session.user.id,
              input_video_url: null,
              analysis_result: analysis
          };

          setVideos(prev => prev.map(v => v.id === finalId ? completedVideo : v));
          fetchProfile(session.user.id);
          setSelectedVideo(completedVideo);

      } catch (e: any) {
          console.error(e);
          // Professional Error Mapping
          let friendlyMsg = "We ran into an issue creating your demo. Please try again.";
          const rawMsg = e.message ? e.message.toLowerCase() : "";
          
          if (rawMsg.includes("duration") || rawMsg.includes("exceeds")) {
              friendlyMsg = "Video is too long. Please use a recording under 5 minutes.";
          } else if (rawMsg.includes("credits") || rawMsg.includes("insufficient")) {
               friendlyMsg = "Insufficient credits. Please top up to continue.";
          } else if (rawMsg.includes("fetch") || rawMsg.includes("network")) {
               friendlyMsg = "Connection issue. Please check your internet.";
          } else if (rawMsg.includes("ffmpeg")) {
               friendlyMsg = "There was a problem processing your video file format. Please ensure it is a valid MP4/MOV.";
          }

          if (processingId) {
               setVideos(prev => prev.map(v => v.id === processingId ? { 
                   ...v, 
                   status: 'failed', 
                   errorMessage: friendlyMsg 
               } : v));
          }
      }
  };

  const handlePurchase = async (productId?: string) => {
      const pid = productId || PRODUCT_10_DEMOS;
      try {
          const { checkout_url } = await createCheckoutSession(pid);
          window.location.href = checkout_url;
      } catch (e) {
          console.error(e);
          alert("We couldn't initiate the secure checkout. Please try again later.");
      }
  };

  const handleDeleteVideo = async (video: VideoProject) => {
      try {
          await deleteVideo(video);
          setVideos(prev => prev.filter(v => v.id !== video.id));
      } catch (e: any) {
          console.error("Delete failed:", e);
          alert("We couldn't delete this video. Please try again.");
      }
  };

  // Hide sidebar if we are on blog pages, pricing, not logged in, or in the editor (active video is null is technically home)
  // Logic update: show sidebar if logged in and not in public pages.
  // The 'editor' view is now part of HomeView but we typically hide sidebar when actively editing to maximize space.
  const isPublicReaderView = ['blog', 'blog-post', 'pricing', 'features', 'about', 'pricing-details'].includes(currentView);
  const isInEditor = currentView === 'home' && videoUrl !== null; 
  // Note: HomeView now manages 'activeVideo'. If activeVideo is set, we are in editor mode.
  // But videoUrl state in App.tsx is for the *landing page dropzone*. 
  // Let's rely on session check mostly.
  
  const showSidebar = session && !isPublicReaderView; 

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      
      {showSidebar && (
          <Sidebar 
            currentView={currentView as any} 
            setCurrentView={(v) => navigateTo(`#/${v}`)} 
            handleLogout={handleLogout} 
            session={session}
          />
      )}

      <main className={`transition-all duration-300 min-h-screen ${showSidebar ? 'md:ml-56 mt-14 md:mt-0' : ''}`}>
          
          {currentView === 'home' && (
              <HomeView 
                  file={file} // Pass legacy file for landing page
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
                  backgroundOptions={backgroundOptions}
              />
          )}

          {currentView === 'blog' && <BlogView />}
          {currentView === 'blog-post' && <BlogPostView slug={route.slug || ''} />}
          {currentView === 'pricing' && <PricingView onPurchase={handlePurchase} />}
          {currentView === 'features' && <FeaturesPage />}
          {currentView === 'about' && <AboutPage />}
          {currentView === 'pricing-details' && <PricingPageSEO />}

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