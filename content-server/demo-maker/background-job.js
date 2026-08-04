import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AssemblyAI } from 'assemblyai';

import { generateVoiceover } from './gemini.js';
import { calculateAudioLineDurations } from './video-processor.js';
import { supabase } from './supabase.js';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from '../storage.js';
import { getDurationValue, parseTime, cleanup, alignSegmentsWithTranscription } from './utils.js';
import { generateStorySegments } from '../gemini.js';

const TEMP_DIR = os.tmpdir();

function getKeyFromUrl(url) {
    if (!url) return null;
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    if (url.startsWith(baseUrl)) {
        return url.replace(baseUrl, '');
    }
    return null;
}

export async function runDemoProcessing(jobData) {
    const { projectId, sourceVideoUrl, sections, voiceId, userId, prompt } = jobData;
    const filesToDelete = [];

    console.log(`[Demo Processing] Starting for Project: ${projectId}`);

    try {
        let segments = [];
        let transcription = null;
        let segmentDurations = [];
        let audioUrl = null;

        const userPrompt = prompt || sections?.find(s => s.type === 'body')?.text || '';

        if (!userPrompt) {
            throw new Error("Missing prompt or script for AI segment generation");
        }

        let aspect = '16:9';
        try {
            const { data: proj } = await supabase
                .from('demo_projects')
                .select('aspect_ratio')
                .eq('id', projectId)
                .single();
            if (proj && proj.aspect_ratio) {
                aspect = proj.aspect_ratio;
            }
        } catch (e) {
            console.error("Failed to get aspect ratio for segment generation:", e);
        }

        let avatarUrl = null;
        try {
            const { data: avatarData } = await supabase
                .from('avatar')
                .select('url')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (avatarData && avatarData.length > 0) {
                avatarUrl = avatarData[0].url;
            }
        } catch (e) {
            console.error("Failed to query user avatars:", e);
        }

        console.log('--- Generating AI Story Segments for Demo ---');
        const result = await generateStorySegments(userPrompt, aspect, 'Cinematic', 'Balanced', false, avatarUrl);
        const aiSegmentsData = result?.segments || [];
        console.log(`Generated ${aiSegmentsData.length} AI segments.`);

        if (aiSegmentsData.length > 0) {
            const segmentsToInsert = aiSegmentsData.map((s, idx) => ({
                project_id: projectId,
                narration: s.narration || "",
                image_prompt: s.image_prompt || s.narration || "AI Scene Prompt",
                animation_prompt: s.animation_prompt || 'Balanced',
                image_url: null,
                avatar_url: s.avatar_url || avatarUrl || null,
                order_index: idx
            }));

            try {
                const { error: insertSegError } = await supabase
                    .from('demo_segments')
                    .insert(segmentsToInsert);
                if (insertSegError) throw insertSegError;
                console.log("Successfully stored demo_segments in DB from generateStorySegments.");
            } catch (err) {
                console.error("Failed to insert demo_segments:", err);
            }

            // Populate the segments list for the voiceover and timeline
            segments = aiSegmentsData.map((s, idx) => ({
                narration: s.narration || "",
                isHook: true,
                video_start: "00:00.000",
                video_end: "00:00.000",
                image_prompt: s.image_prompt || s.narration || "AI Scene Prompt",
                animation_prompt: s.animation_prompt || 'Balanced',
                avatar_url: s.avatar_url || avatarUrl || null,
                order_index: idx
            }));
        }

        if (segments.length > 0) {
            console.log('--- Generating Voiceover ---');
            
            const { audioBuffer } = await generateVoiceover(segments, voiceId, "Read aloud in a calm, deliberate tone with brisk continuous delivery");
            
            const rawAudioPath = path.join(TEMP_DIR, `raw_audio_${uuidv4()}.pcm`);
            filesToDelete.push(rawAudioPath);
            fs.writeFileSync(rawAudioPath, audioBuffer);
            
            const audioFilename = `audio_${uuidv4()}.wav`;
            const audioPath = path.join(TEMP_DIR, audioFilename);
            filesToDelete.push(audioPath);
            
            try {
                execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${audioPath}"`, { stdio: 'ignore' });
            } catch (e) {
                console.error("FFmpeg PCM Conversion Failed:", e);
                throw new Error("Failed to convert TTS audio");
            }

            const totalAudioDuration = getDurationValue(audioPath);

            // Upload audio to R2
            const audioKey = `demo-audio/${audioFilename}`;
            await s3.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: audioKey,
                Body: fs.createReadStream(audioPath),
                ContentType: 'audio/wav'
            }));
            audioUrl = `${R2_PUBLIC_URL}/${audioKey}`;

            console.log('--- Transcribing Audio ---');
            const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
            const transcriptRes = await aaiClient.transcripts.transcribe({
                audio: audioPath,
                speech_models: ["universal-3-pro", "universal-2"],
                language_detection: true,
            });

            let filteredWords = [];
            if (transcriptRes.words) {
                filteredWords = transcriptRes.words.map(w => ({
                    text: w.text ? w.text.replace(/— |;|:|(?<!\d)[.,]|[.,](?!\d)/g, '') : '',
                    start: w.start,
                    end: w.end
                }));
            }
            transcription = { 
                text: transcriptRes.text || '',
                words: filteredWords 
            };

            console.log('--- Aligning Segments ---');
            segmentDurations = alignSegmentsWithTranscription(segments, transcription, totalAudioDuration);
            
            if (!segmentDurations) {
                console.log("Transcription alignment failed, falling back to character count.");
                segmentDurations = calculateAudioLineDurations(segments, totalAudioDuration);
            }
        }

        console.log('--- Saving to Database ---');
        await supabase.from('demo_projects').update({
            transcription,
            segments,
            segment_durations: segmentDurations,
            voice_path: audioUrl,
            status: 'ready'
        }).eq('id', projectId);

        console.log(`[Demo Processing] Completed for Project: ${projectId}`);

    } catch (error) {
        console.error(`[Demo Processing] Error for Project ${projectId}:`, error);
        await supabase.from('demo_projects').update({ status: 'failed' }).eq('id', projectId);
        
        // Refund credit
        await supabase.rpc('grant_credits_from_purchase', {
             p_user_id: userId,
             p_credits_to_add: 1,
             p_description: 'Refund: Demo processing failed',
             p_metadata: { error: error.message }
        });
    } finally {
        cleanup(filesToDelete);
    }
}

export async function runDemoAudioRegeneration({ projectId, segments, voiceId, userId }) {
    const filesToDelete = [];
    console.log(`[Demo Audio Regen] Starting for Project: ${projectId}`);
    try {
        let transcription = null;
        let segmentDurations = [];
        let audioUrl = null;

        const { audioBuffer } = await generateVoiceover(segments, voiceId, "Read aloud in a calm, deliberate tone with brisk continuous delivery");

        const rawAudioPath = path.join(TEMP_DIR, `raw_audio_${uuidv4()}.pcm`);
        filesToDelete.push(rawAudioPath);
        fs.writeFileSync(rawAudioPath, audioBuffer);
        
        const audioFilename = `audio_${uuidv4()}.wav`;
        const audioPath = path.join(TEMP_DIR, audioFilename);
        filesToDelete.push(audioPath);
        
        try {
            execSync(`ffmpeg -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -y "${audioPath}"`, { stdio: 'ignore' });
        } catch (e) {
            console.error("FFmpeg PCM Conversion Failed:", e);
            throw new Error("Failed to convert TTS audio");
        }

        const totalAudioDuration = getDurationValue(audioPath);

        // Upload audio to R2
        const audioKey = `demo-audio/${audioFilename}`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: audioKey,
            Body: fs.createReadStream(audioPath),
            ContentType: 'audio/wav'
        }));
        audioUrl = `${R2_PUBLIC_URL}/${audioKey}`;

        console.log('--- Transcribing Audio ---');
        const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
        const transcriptRes = await aaiClient.transcripts.transcribe({
            audio: audioPath,
            speech_models: ["universal-3-pro", "universal-2"],
            language_detection: true,
        });

        let filteredWords = [];
        if (transcriptRes.words) {
            filteredWords = transcriptRes.words.map(w => ({
                text: w.text ? w.text.replace(/— |;|:|(?<!\d)[.,]|[.,](?!\d)/g, '') : '',
                start: w.start,
                end: w.end
            }));
        }
        transcription = { 
            text: transcriptRes.text || '',
            words: filteredWords 
        };

        console.log('--- Aligning Segments ---');
        segmentDurations = alignSegmentsWithTranscription(segments, transcription, totalAudioDuration);
        
        if (!segmentDurations) {
            console.log("Transcription alignment failed, falling back to character count.");
            segmentDurations = calculateAudioLineDurations(segments, totalAudioDuration);
        }

        console.log('--- Saving to Database ---');
        // Fetch existing project to get the old voice_path
        const { data: project } = await supabase.from('demo_projects').select('voice_path').eq('id', projectId).single();

        await supabase.from('demo_projects').update({
            transcription,
            segments,
            segment_durations: segmentDurations,
            voice_path: audioUrl,
            status: 'ready'
        }).eq('id', projectId);

        // Delete the old audio from R2 if it exists
        if (project && project.voice_path) {
            const oldKey = getKeyFromUrl(project.voice_path);
            if (oldKey) {
                console.log(`[Demo Audio Regen] Deleting old audio: ${oldKey}`);
                await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey })).catch(err => {
                    console.error("[Demo Audio Regen] Error deleting old audio:", err);
                });
            }
        }

        console.log(`[Demo Audio Regen] Completed for Project: ${projectId}`);
        return { audioUrl, transcription, segmentDurations };

    } catch (error) {
        console.error(`[Demo Audio Regen] Error for Project ${projectId}:`, error);
        throw error;
    } finally {
        cleanup(filesToDelete);
    }
}

export async function runDemoExport({ projectId, userId, motionGraphicsEnabled, exportQuality }) {
    console.log(`[Demo Export] Starting for Project: ${projectId}`);
    const filesToDelete = [];
    const workDir = path.join(TEMP_DIR, `demo_export_${uuidv4()}`);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

    try {
        const { data: project } = await supabase.from('demo_projects').select('*').eq('id', projectId).single();
                
        if (!project || !project.voice_path) {
            throw new Error("Missing assets for export");
        }

        const audioUrl = project.voice_path;
        const filesData = project.files_data || [];
        
        let demoSegments = [];
        const { data: dbSegments } = await supabase.from('demo_segments')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });
        
        if (dbSegments && dbSegments.length > 0) {
            demoSegments = dbSegments.map(s => ({
                ...s,
                image_url: s.image_url ? s.image_url.replace(/ /g, '%20') : null
            }));
        } else {
            demoSegments = (project.segments || []).map(s => ({
                ...s,
                image_url: s.image_url ? s.image_url.replace(/ /g, '%20') : null
            }));
        }

        const transcription = project.transcription;

        const is480p = exportQuality === '480p';
        const aspectRatio = project.aspect_ratio || '16:9';
        const width = aspectRatio === '9:16' ? (is480p ? 480 : 1080) : (is480p ? 854 : 1920);
        const height = aspectRatio === '9:16' ? (is480p ? 854 : 1920) : (is480p ? 480 : 1080);
        const fps = 30;

        let totalAudioDuration = 0;
        if (project.segment_durations && project.segment_durations.length > 0) {
            totalAudioDuration = project.segment_durations.reduce((a,b) => a+b, 0);
        } else if (transcription && transcription.words && transcription.words.length > 0) {
            totalAudioDuration = transcription.words[transcription.words.length - 1].end / 1000 + 1.5;
        } else {
            totalAudioDuration = 10;
        }
        
        const durationInFrames = Math.max(1, Math.ceil(totalAudioDuration * fps));

        console.log(`[Demo Export] Using Remotion Bundler. Duration: ${durationInFrames} frames, Size: ${width}x${height}`);

        const { bundle } = await import("@remotion/bundler");
        const { renderMedia, selectComposition } = await import("@remotion/renderer");

        const bundleLocation = await bundle({
            entryPoint: path.resolve("./demo-maker/remotion-root.tsx"),
            webpackOverride: (config) => config
        });

        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: "MyVideo",
            inputProps: {
                audioUrl,
                filesData,
                transcription,
                fps,
                width,
                height,
                durationInFrames,
                highlightedWords: project.subtitles,
                demoSegments,
                segmentDurations: project.segment_durations
            }
        });

        // Override composition parameters
        composition.durationInFrames = durationInFrames;
        composition.width = width;
        composition.height = height;

        const finalPath = path.join(workDir, `final.mp4`);

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: "h264",
            outputLocation: finalPath,
            inputProps: {
                audioUrl,
                filesData,
                transcription,
                fps,
                width,
                height,
                durationInFrames,
                highlightedWords: project.subtitles,
                demoSegments,
                segmentDurations: project.segment_durations
            }
        });

        // Upload Final Video
        const finalBuffer = fs.readFileSync(finalPath);
        const finalKey = `content/stories/${uuidv4()}.mp4`;
        
        // Save locally
        const exportsDir = path.join(process.cwd(), 'demo-maker', 'exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
        const localExportPath = path.join(exportsDir, `demo_${projectId}_${Date.now()}.mp4`);
        fs.writeFileSync(localExportPath, finalBuffer);
        console.log(`[Demo Export] Saved locally to: ${localExportPath}`);

        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: finalKey,
            Body: finalBuffer,
            ContentType: 'video/mp4'
        }));
        
        const videoUrl = `${R2_PUBLIC_URL}/${finalKey}`;

        // Update Story Entry
        const { error: storyError } = await supabase.from('content_stories').update({
            video_url: videoUrl,
            status: 'completed'
        }).eq('demo_project_id', projectId);
        
        if (storyError) {
            console.error("Failed to update story:", storyError);
            await supabase.from('content_stories').insert({
                user_id: userId,
                demo_project_id: projectId,
                video_url: videoUrl,
                status: 'completed'
            });
        }
        
        await supabase.from('demo_projects').update({ status: 'ready' }).eq('id', projectId);
        
        console.log(`[Demo Export] Completed for Project: ${projectId}`);
    } catch (error) {
        console.error(`[Demo Export] Error for Project ${projectId}:`, error);
        await supabase.from('demo_projects').update({ status: 'failed' }).eq('id', projectId);
        await supabase.from('content_stories').update({ status: 'failed' }).eq('demo_project_id', projectId);
    } finally {
        cleanup(filesToDelete);
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    }
}
