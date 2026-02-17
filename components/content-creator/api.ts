


import { ContentProject, ContentSegment } from "./types";
import { supabase } from "../../supabaseClient";

const API_URL = "ttps://content-creator-417540185411.us-central1.run.app"; // Or env var

export async function generateSegments(prompt: string, aspect: string, style: string, effect: string, userId: string, narrationStyle: string, visualDensity: string, pictureQuality: string, subtitles: string) {
    const res = await fetch(`${API_URL}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: aspect, style, effect, userId, narrationStyle, visualDensity, pictureQuality, subtitles })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
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
        throw new Error(err.error || "Edit failed");
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
        throw new Error(err.error || "Regeneration failed");
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

export async function generateFinalVideo(projectId: string, voiceId: string, userId: string) {
    const res = await fetch(`${API_URL}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, voiceId, userId })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start generation");
    }
}

export async function deleteProject(projectId: string, userId: string) {
    const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Delete failed");
}

export async function deleteStory(storyId: string, userId: string) {
    const res = await fetch(`${API_URL}/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error("Delete failed");
}