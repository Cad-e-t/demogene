
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';


import { HomeView } from './components/HomeView';
import { VideoModal } from './components/VideoModal';
import { ContentApp } from './components/content-creator/ContentApp';
import { ContentLanding } from './components/content-creator/ContentLanding';
import { TermsOfService } from './components/TermsOfService';
import { LoginPage } from './components/LoginPage';

import { CropData, TrimData, VoiceOption, VideoProject, TimeRange, BackgroundOption } from './types';
import { VOICES, BACKGROUNDS } from './constants';
import { processVideoRequest, createCheckoutSession, deleteVideo } from './frontend-api';
import { DEFAULT_SCRIPT_RULES, DEFAULT_TTS_STYLE } from './scriptStyles';

// Custom Event for Navigation
const PUSH_STATE_EVENT = 'pushstate';

// Navigation Helper
export const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(PUSH_STATE_EVENT));
  window.scrollTo(0, 0);
};

// Custom Route Hook using History API
const usePathRoute = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => {
      setPath(window.location.pathname);
    };
    
    window.addEventListener(PUSH_STATE_EVENT, handlePathChange);
    window.addEventListener('popstate', handlePathChange); // Handle back/forward buttons
    
    return () => {
      window.removeEventListener(PUSH_STATE_EVENT, handlePathChange);
      window.removeEventListener('popstate', handlePathChange);
    };
  }, []);

  if (path.startsWith('/blog/')) {
    return { view: 'blog-post', slug: path.replace('/blog/', '') };
  }
  if (path === '/blog') return { view: 'blog', slug: null };
  if (path === '/videos') return { view: 'videos', slug: null };
  if (path === '/pricing') return { view: 'pricing', slug: null };
  if (path === '/features') return { view: 'features', slug: null };
  if (path === '/about') return { view: 'about', slug: null };
  if (path === '/terms') return { view: 'terms', slug: null };
  if (path === '/login') return { view: 'login', slug: null };
  if (path === '/pricing-details') return { view: 'pricing-details', slug: null };
  if (path.startsWith('/content-creator')) return { view: 'content-creator', slug: null };
  if (path === '/demo') return { view: 'demo', slug: null };
  return { view: 'home', slug: null };
};

interface UserProfile {
    id: string;
    credits: number;
    dodo_customer_id?: string;
}

const PRODUCT_10_DEMOS = "pdt_2LwDVRweVv9iX22U5RDSW"; 

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showFailureNotification, setShowFailureNotification] = useState(false);
  
  // URL-based Navigation
  const route = usePathRoute();
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

  // Editor State Lifted for Persistence
  const [activeVideo, setActiveVideo] = useState<VideoProject | null>(null);
  const [segments, setSegments] = useState<TimeRange[] | null>(null);
  const [background, setBackground] = useState<BackgroundOption>(BACKGROUNDS[0]);
  const [addZooms, setAddZooms] = useState(true);

  // New Video Type State
  const [videoType, setVideoType] = useState<'demo' | 'tutorial' | null>(null);
  const [tutorialGoal, setTutorialGoal] = useState<string>("");
  
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
          fetchProfile(session.user.id);

          // Redirect Logic for Content Creator App
          const redirectTarget = localStorage.getItem('productcam_redirect');
          if (redirectTarget) {
              localStorage.removeItem('productcam_redirect');
              if (redirectTarget.includes('#/')) {
                  navigateTo(redirectTarget.replace('#', ''));
              } else {
                  navigateTo(redirectTarget);
              }
          } else {
              // Default landing to creator studio if on root
              if (window.location.pathname === '/') {
                  navigateTo('/content-creator');
              }
          }
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
    const baseUrl = "https://creator.productcam.site";
    let path = window.location.pathname;
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
    navigateTo('/login');
  };

  const handleLogout = async () => {
      await (supabase.auth as any).signOut();
      setSession(null);
      setProfile(null);
      setVideos([]);
      window.location.href = '/';
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
                    if (dbVid.status === 'processing' || dbVid.status === 'uploaded') {
                        finalVideos.push(localVid);
                    } else {
                        finalVideos.push(dbVid);
                    }
                } else {
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
      setVideoType(null);
      setTutorialGoal("");
      
      if (!session) navigateTo('/login');
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
    setVideoType(null);
    setTutorialGoal("");
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
      if (videoType === 'tutorial' && !tutorialGoal.trim()) {
          setErrorMessage("Please provide a goal for the tutorial.");
          return;
      }
      if (profile && profile.credits < 1) {
          setErrorMessage("You don't have enough credits. Please purchase a pack to continue.");
          return;
      }

      setErrorMessage(null);

      // NAVIGATE FIRST to prevent duplicate clicks and ensure UI transition
      navigateTo('/videos');

      const sourceVideo = videos.find(v => v.id === videoId);
      const sourceTitle = sourceVideo ? sourceVideo.title : "New Project";
      const demoTitle = sourceTitle.endsWith('(Demo)') ? sourceTitle : `${sourceTitle} (Demo)`;
      
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
                  setVideos(prev => [optimisticVideo, ...prev]);
              },
              videoType || 'demo',
              tutorialGoal
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

  // Content Creator Application Handling
  if (currentView === 'content-creator') {
    return <ContentApp session={session} onNavigate={navigateTo} />;
  }

  // Login page
  if (currentView === 'login') {
    return <LoginPage />;
  }

  // Not logged in -> Show New Content Landing Page
  if (!session && currentView === 'home') {
      return <ContentLanding onLogin={handleLogin} onNavigate={navigateTo} />;
  }

  // Hide sidebar if we are on blog pages, pricing, not logged in, or in the editor (active video is null is technically home)
  const isPublicReaderView = ['blog', 'blog-post', 'pricing', 'features', 'about', 'pricing-details'].includes(currentView);
  
  const showSidebar = false; // session && !isPublicReaderView; 

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      
      <main className={`transition-all duration-300 min-h-screen ${showSidebar ? 'md:ml-56 mt-14 md:mt-0' : ''}`}>
          
          {(currentView === 'home' || currentView === 'demo') && (
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
                  videoType={videoType} setVideoType={setVideoType}
                  tutorialGoal={tutorialGoal} setTutorialGoal={setTutorialGoal}
                  
                  // Lifted State
                  activeVideo={activeVideo} setActiveVideo={setActiveVideo}
                  segments={segments} setSegments={setSegments}
                  background={background} setBackground={setBackground}
                  addZooms={addZooms} setAddZooms={setAddZooms}

                  errorMessage={errorMessage}
                  onFileChange={handleFileChange}
                  onClearFile={handleClearFile}
                  onGenerate={handleGenerate}
                  onPurchase={handlePurchase}
                  handleLogin={handleLogin}
                  showSuccessNotification={showSuccessNotification}
                  setShowSuccessNotification={setShowSuccessNotification}
                  showFailureNotification={showFailureNotification}
                  setShowFailureNotification={setShowFailureNotification}
                  backgroundOptions={backgroundOptions}
                  onNavigate={navigateTo}
              />
          )}

          {currentView === 'terms' && <TermsOfService onNavigate={navigateTo} />}

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
