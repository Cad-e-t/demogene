import { AnalysisResult, CropData, ProcessingStatus, TrimData, TimeRange, VideoProject } from './types';
import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.API_BASE_URL || 'https://demo-maker-417540185411.us-central1.run.app' ;
const PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'https://dodo-payments-service-417540185411.us-central1.run.app';

export async function processVideoRequest(
  file: File,
  crop: CropData,
  trim: TrimData,
  voiceId: string,
  userId: string,
  onStatusUpdate: (status: ProcessingStatus['step']) => void,
  appName?: string,
  appDescription?: string,
  scriptRules?: string,
  stylePrompt?: string,
  segments?: TimeRange[] // New optional parameter
): Promise<{ videoUrl: string; analysis: AnalysisResult }> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('crop', JSON.stringify(crop));
  formData.append('trim', JSON.stringify(trim));
  formData.append('voiceId', voiceId);
  formData.append('userId', userId);
  
  if (segments) {
    formData.append('segments', JSON.stringify(segments));
  }
  
  if (appName) {
    formData.append('appName', appName);
  }

  if (appDescription) {
    formData.append('appDescription', appDescription);
  }

  if (scriptRules) {
    formData.append('scriptRules', scriptRules);
  }

  if (stylePrompt) {
    formData.append('stylePrompt', stylePrompt);
  }

  // Initial status update (App.tsx might already set this, but safe to reinforce)
  onStatusUpdate('analyzing');

  try {
    const response = await fetch(`${API_BASE_URL}/process-video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        let errMessage = response.statusText;
        try {
            const errJson = await response.json();
            if (errJson.error) errMessage = errJson.error;
        } catch (e) {
             try {
                 const errText = await response.text();
                 if (errText) errMessage = errText;
             } catch(e2) {}
        }
        throw new Error(errMessage);
    }

    // Retrieve Video ID from header instead of potentially massive analysis JSON
    const videoId = response.headers.get('X-Video-Id');
    if (!videoId) {
      throw new Error('Missing video ID header from server');
    }
    
    // Get the video file blob
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);

    // Fetch the full analysis from the database to avoid header size/character limits
    const { data: videoRecord, error: dbError } = await supabase
        .from('videos')
        .select('analysis_result')
        .eq('id', videoId)
        .single();

    if (dbError || !videoRecord) {
        throw new Error('Failed to retrieve analysis results from database');
    }

    const analysis: AnalysisResult = videoRecord.analysis_result as AnalysisResult;

    onStatusUpdate('complete');
    return { videoUrl, analysis };

  } catch (error) {
    onStatusUpdate('error');
    throw error;
  }
}

export async function createCheckoutSession(productId: string) {
    const { data: { session } } = await (supabase.auth as any).getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(`${PAYMENT_API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ productId })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create checkout session');
    }

    return await response.json();
}

/**
 * Deletes a video from the database and removes its associated storage objects.
 */
export async function deleteVideo(video: VideoProject): Promise<void> {
    // 1. Delete from database
    const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

    if (dbError) throw dbError;

    // 2. Delete from storage
    const pathsToDelete: string[] = [];

    const getStoragePath = (url: string | null) => {
        if (!url) return null;
        // Extracts "inputs/uuid.mp4" or "outputs/uuid.mp4" from the full Supabase public URL
        const parts = url.split('/uploads/');
        return parts.length > 1 ? parts[1] : null;
    };

    // Fixed: input_video_url is now part of the VideoProject interface in types.ts
    const inputPath = getStoragePath(video.input_video_url || (video as any).input_video_url);
    const finalPath = getStoragePath(video.final_video_url);

    if (inputPath) pathsToDelete.push(inputPath);
    if (finalPath) pathsToDelete.push(finalPath);

    if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
            .from('uploads')
            .remove(pathsToDelete);
        
        if (storageError) {
            console.error("Failed to delete storage objects:", storageError);
            // We don't necessarily throw here if the DB record is already gone,
            // but logging it is good practice.
        }
    }
}