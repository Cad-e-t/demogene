
import { AnalysisResult, CropData, ProcessingStatus, TrimData } from './types';

const API_BASE_URL = 'http://localhost:8000';

export async function processVideoRequest(
  file: File,
  crop: CropData,
  trim: TrimData,
  voiceId: string,
  onStatusUpdate: (status: ProcessingStatus['step']) => void
): Promise<{ videoUrl: string; analysis: AnalysisResult }> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('crop', JSON.stringify(crop));
  formData.append('trim', JSON.stringify(trim));
  formData.append('voiceId', voiceId);

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
            const errText = await response.text();
            if (errText) errMessage = errText;
        } catch (e) {
            // ignore
        }
      throw new Error(`Server Error: ${errMessage}`);
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
