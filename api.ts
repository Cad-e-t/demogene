

import { AnalysisResult, CropData, ProcessingStatus, TrimData } from './types';
import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:8000';
const PAYMENT_API_URL = 'http://localhost:8087';

export async function processVideoRequest(
  file: File,
  crop: CropData,
  trim: TrimData,
  voiceId: string,
  userId: string,
  onStatusUpdate: (status: ProcessingStatus['step']) => void,
  appDescription?: string
): Promise<{ videoUrl: string; analysis: AnalysisResult }> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('crop', JSON.stringify(crop));
  formData.append('trim', JSON.stringify(trim));
  formData.append('voiceId', voiceId);
  formData.append('userId', userId);
  
  if (appDescription) {
    formData.append('appDescription', appDescription);
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

    const analysisHeader = response.headers.get('X-Analysis-Result');
    if (!analysisHeader) {
      throw new Error('Missing analysis result header from server');
    }
    
    const analysis: AnalysisResult = JSON.parse(analysisHeader);
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);

    onStatusUpdate('complete');
    return { videoUrl, analysis };

  } catch (error) {
    onStatusUpdate('error');
    throw error;
  }
}

export async function createCheckoutSession(productId: string) {
    const { data: { session } } = await supabase.auth.getSession();
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
