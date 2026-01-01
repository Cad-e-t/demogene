export interface CropData {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  width: number; // Normalized 0-1
  height: number; // Normalized 0-1
}

export interface TrimData {
  start: number; // Seconds
  end: number; // Seconds
}

export interface TimeRange {
  id: string;
  start: number;
  end: number;
}

export interface VideoSegment {
  start_time: string | number;
  end_time: string | number;
  neutral_visual_description: string;
  purpose: string;
  mouse_activity: {
    clicks: Array<{ type: string; x: number; y: number; time: string | number }>;
    hover_regions: Array<{ x1: number; y1: number; x2: number; y2: number; start_time: string; end_time: string }>;
  } | null;
}

export interface ScriptLine {
  segment_index: number;
  type: 'hook' | 'body' | 'cta';
  narration: string;
}

export interface BackgroundGradient {
  start_color: string;
  end_color: string;
  style: 'vertical' | 'radial';
}

export interface BackgroundOption {
  id: string;
  name: string;
  url?: string | null; // Optional for options like "No Background"
  thumbnail?: string; // Made optional as some backgrounds (like "None") don't need them
}

export interface AnalysisResult {
  background_gradient: BackgroundGradient;
  segments: VideoSegment[];
  script: {
    script_lines: ScriptLine[];
  };
}

export interface ProcessingStatus {
  step: 'idle' | 'uploading' | 'analyzing' | 'generating_audio' | 'rendering' | 'complete' | 'error';
  message?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
}

export interface VideoProject {
    id: string;
    title: string;
    input_video_url?: string | null;
    final_video_url: string | null;
    created_at: string;
    status: 'processing' | 'completed' | 'failed';
    voice_id: string;
    background_id?: string;
    analysis_result?: AnalysisResult;
    user_id: string;
    processingStep?: ProcessingStatus['step'];
    errorMessage?: string;
}