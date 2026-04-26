


import { ContentProject, ContentSegment, SubtitleConfiguration } from "./types";
import { supabase } from "../../supabaseClient";

export const API_URL = "https://content-creator-417540185411.us-central1.run.app"; // Or env var

const sanitizeError = (error: string, fallback: string) => {
    if (!error) return fallback;
    const lower = error.toLowerCase();
    const technicalTerms = [
        'quota', 'limit', 'rate', 'internal server error', '500', '404', '403', '401', 
        'bad request', 'upstream', 'gateway', 'proxy', 'socket', 'connection', 'refused',
        'fetch', 'network', 'timeout', 'safety', 'model', 'ai', 'gemini', '{', '}'
    ];
    const isTechnical = technicalTerms.some(term => lower.includes(term)) || error.length > 150;
    
    if (isTechnical) {
        if (lower.includes('safety')) {
            return "The content was flagged by our safety filters. Please try a different prompt.";
        }
        if (lower.includes('insufficient') || lower.includes('credit') || lower.includes('balance')) {
             return error; // Keep credit errors as they are friendly enough
        }
        return fallback;
    }
    return error;
};

export async function generateUploadUrl(projectId: string, segmentId: string, filename: string, contentType: string) {
    const res = await fetch(`${API_URL}/generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, segmentId, filename, contentType })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Failed to generate upload URL. Please try again."));
    }
    return await res.json();
}

export async function updateSegmentImage(segmentId: string, newImageUrl: string, oldImageUrl: string) {
    const res = await fetch(`${API_URL}/update-segment-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, newImageUrl, oldImageUrl })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Failed to update segment image. Please try again."));
    }
    return await res.json();
}

export async function generateSegments(prompt: string, aspect: string, style: string, effect: string, userId: string, narrationStyle: string, subtitles: SubtitleConfiguration, voiceId: string, signal?: AbortSignal) {
    const res = await fetch(`${API_URL}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: aspect, style, effect, userId, narrationStyle, subtitles, voiceId }),
        signal
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Generation failed. Please try again later."));
    }
    return await res.json();
}

export async function editImageSegment(segmentId: string, currentImageUrl: string, editPrompt: string) {
    const res = await fetch(`${API_URL}/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, currentImageUrl, editPrompt })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Edit failed. Please try again."));
    }
    return await res.json();
}

export async function regenerateImageSegment(segmentId: string, projectId: string, imagePrompt: string, aspectRatio: string, currentImageUrl: string | null) {
    const res = await fetch(`${API_URL}/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, projectId, imagePrompt, aspectRatio, currentImageUrl })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Regeneration failed. Please try again."));
    }
    return await res.json();
}

export async function saveSegments(segments: ContentSegment[]) {
    // Update narrations directly in Supabase
    const updates = segments.map(seg =>
        supabase.from('content_segments')
            .update({ narration: seg.narration })
            .eq('id', seg.id)
    );
    await Promise.all(updates);
}

export async function generateAssets(projectId: string, voiceId: string, userId: string, script?: string) {
    const res = await fetch(`${API_URL}/generate-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, voiceId, userId, script })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Asset generation failed. Please try again."));
    }
    return await res.json();
}

export async function exportVideo(projectId: string, userId: string, quality: string = '1080p') {
    const res = await fetch(`${API_URL}/export-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId, quality })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Export failed. Please try again."));
    }
    return await res.json();
}

export async function deleteProject(projectId: string, userId: string) {
    const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Delete failed. Please try again.");
}

export async function deleteStory(storyId: string, userId: string) {
    const res = await fetch(`${API_URL}/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Delete failed. Please try again.");
}

export async function generateVideoSegment(segmentId: string, imageUrl: string, animationPrompt: string) {
    const res = await fetch(`${API_URL}/video-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, imageUrl, animationPrompt })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Video generation failed. Please try again."));
    }
    return await res.json();
}

export async function animateAllSegments(projectId: string, userId: string) {
    const res = await fetch(`${API_URL}/animate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(sanitizeError(err.error, "Batch animation failed. Please try again."));
    }
    return await res.json();
}