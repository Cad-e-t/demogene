import { AnalysisResult, CropData, ProcessingStatus, TrimData, TimeRange, VideoProject } from './types';
import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.API_BASE_URL || 'https://demo-maker-417540185411.us-central1.run.app' ;
const PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'https://dodo-payments-service-417540185411.us-central1.run.app';

export async function generateUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string, publicUrl: string, key: string }> {
    const response = await fetch(`${API_BASE_URL}/generate-upload-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName, fileType }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate upload URL');
    }

    return await response.json();
}

export async function processVideoRequest(
  videoId: string,
  segments: TimeRange[] | undefined,
  crop: CropData,
  trim: TrimData,
  voiceId: string,
  backgroundId: string,
  userId: string,
  onStatusUpdate: (status: ProcessingStatus['step']) => void,
  appName?: string,
  appDescription?: string,
  scriptRules?: string,
  stylePrompt?: string,
  disableZoom?: boolean,
  onIdAssigned?: (newId: string) => void,
  videoType?: 'demo' | 'tutorial',
  tutorialGoal?: string
): Promise<{ videoId: string, videoUrl: string; analysis: AnalysisResult }> {
  
  const payload = {
      videoId,
      crop,
      trim,
      voiceId,
      backgroundId,
      userId,
      disableZoom: !!disableZoom,
      segments: segments || null,
      appName: appName || undefined,
      appDescription: appDescription || undefined,
      scriptRules: scriptRules || undefined,
      stylePrompt: stylePrompt || undefined,
      videoType: videoType || 'demo',
      tutorialGoal: tutorialGoal || undefined
  };

  onStatusUpdate('analyzing');

  try {
    // 1. Initiate Background Job
    const response = await fetch(`${API_BASE_URL}/process-video`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
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

    // 2. Parse response to get the NEW video ID created by server
    const responseData = await response.json();
    const processingVideoId = responseData.videoId || videoId;

    if (onIdAssigned) {
        onIdAssigned(processingVideoId);
    }

    // 3. Poll Supabase for Completion of the NEW video
    // We poll every 3 seconds to check the video status
    return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
            try {
                const { data, error } = await supabase
                    .from('videos')
                    .select('status, final_video_url, analysis_result')
                    .eq('id', processingVideoId) // Poll the new ID
                    .single();
                
                if (error) {
                    console.error("Polling Error:", error);
                    // Don't reject immediately on transient network error, wait for next poll? 
                    // For now, let's keep retrying unless it's a fatal DB error (rare).
                    return; 
                }

                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    onStatusUpdate('complete');
                    
                    if (!data.final_video_url) {
                        reject(new Error("Video marked completed but missing URL"));
                        return;
                    }

                    resolve({
                        videoId: processingVideoId,
                        videoUrl: data.final_video_url,
                        analysis: data.analysis_result as AnalysisResult
                    });
                } else if (data.status === 'failed') {
                    clearInterval(pollInterval);
                    reject(new Error("Video processing failed. Please try again."));
                } else if (data.status === 'processing') {
                    // Infer progress step based on data presence
                    if (data.analysis_result) {
                        onStatusUpdate('rendering'); // If analysis exists, we are likely rendering or doing TTS
                    } else {
                        onStatusUpdate('analyzing');
                    }
                }
            } catch (e) {
                // If critical polling logic fails (e.g. auth lost), stop and reject
                clearInterval(pollInterval);
                reject(e);
            }
        }, 3000);
    });

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

export async function deleteVideo(video: VideoProject): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/videos/${video.id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: video.user_id })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete video');
    }
}