
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';


import { ContentApp } from './components/content-creator/ContentApp';
import { ContentLanding } from './components/content-creator/ContentLanding';
import { TermsOfService } from './components/TermsOfService';
import { LoginPage } from './components/LoginPage';

import { CropData, TrimData, VoiceOption, VideoProject, TimeRange, BackgroundOption } from './types';
import { VOICES, BACKGROUNDS } from './constants';
import { processVideoRequest, createCheckoutSession, deleteVideo } from './frontend-api';

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
  
  // Gallery State
  // (No state needed here anymore as ContentApp handles its own)

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
      window.location.href = '/';
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      
      <main className="transition-all duration-300 min-h-screen">
          
          {currentView === 'terms' && <TermsOfService onNavigate={navigateTo} />}

      </main>

    </div>
  );
}
