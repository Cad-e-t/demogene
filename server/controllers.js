import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { supabase } from './supabase.js';
import { runVideoProcessing } from './background-job.js';

export const generateUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: 'Missing fileName or fileType' });

    const key = `inputs/${uuidv4()}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Construct the public URL for retrieval
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

export const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing User ID' });

        const { data: video, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !video) return res.status(404).json({ error: 'Video not found' });
        
        if (video.user_id !== userId) {
             return res.status(403).json({ error: 'Forbidden' });
        }

        const filesToDelete = [];

        const getKeyFromUrl = (url) => {
            if (!url) return null;
            const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
            if (url.startsWith(baseUrl)) {
                return url.replace(baseUrl, '');
            }
            return null;
        };

        // If it's a raw upload/asset, we delete the input file
        if (video.status === 'uploaded' && video.input_video_url) {
             const key = getKeyFromUrl(video.input_video_url);
             if (key) filesToDelete.push(key);
        }

        // If it's a generated video, we delete the final output file
        // We do NOT delete the input file as it might be an asset used by others
        if (video.status !== 'uploaded' && video.final_video_url) {
             const key = getKeyFromUrl(video.final_video_url);
             if (key) filesToDelete.push(key);
        }

        if (filesToDelete.length > 0) {
            console.log(`Deleting files for video ${id}:`, filesToDelete);
            await Promise.allSettled(filesToDelete.map(key => 
                s3.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key
                }))
            ));
        }

        const { error: delError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (delError) throw delError;

        res.json({ success: true });

    } catch (e) {
        console.error("Delete Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const processVideo = async (req, res) => {
  try {
    // Note: videoId here refers to the SOURCE video uploaded by the user
    let { videoId, crop, trim, segments, voiceId, backgroundId, userId, appName, appDescription, scriptRules, stylePrompt, disableZoom, videoType, tutorialGoal } = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    }
    
    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    try { if (typeof crop === 'string') crop = JSON.parse(crop); } catch(e){}
    try { if (typeof trim === 'string') trim = JSON.parse(trim); } catch(e){}
    try { if (typeof segments === 'string') segments = JSON.parse(segments); } catch(e){}

    // 1. Initial Credit Check (Fast Fail)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
    
    if (profileError || !profile) {
        return res.status(500).json({ error: 'Could not fetch user profile for credit check' });
    }
    
    if (profile.credits < 1) {
        return res.status(402).json({ error: 'Insufficient credits. Please purchase a pack.' });
    }

    // 2. Fetch Source Video Details
    const { data: sourceVideo, error: sourceError } = await supabase
        .from('videos')
        .select('input_video_url, title')
        .eq('id', videoId)
        .single();

    if (sourceError || !sourceVideo) {
        return res.status(404).json({ error: 'Original video not found' });
    }

    // 3. Create a NEW Record for the "Output" (Project)
    // This ensures we do not overwrite the user's raw upload, allowing for re-generations.
    const newVideoId = uuidv4();
    const newTitle = sourceVideo.title.includes('(Demo)') ? sourceVideo.title : `${sourceVideo.title} (Demo)`;

    const { error: insertError } = await supabase
        .from('videos')
        .insert({
            id: newVideoId,
            user_id: userId,
            title: newTitle,
            input_video_url: sourceVideo.input_video_url, // Copy the source URL
            status: 'processing',
            voice_id: voiceId,
            background_id: backgroundId,
            crop_data: crop,
            trim_data: trim
            // analysis_result will be populated during processing
        });
    
    if (insertError) {
        console.error("Failed to create new project record:", insertError);
        return res.status(500).json({ error: 'Failed to create project record' });
    }

    // 4. Respond with the NEW ID
    res.status(202).json({ 
        message: 'Video processing started in background', 
        videoId: newVideoId 
    });

    // 5. Trigger Asynchronous Processing with the NEW ID
    runVideoProcessing({
        videoId: newVideoId, // Pass the NEW ID
        crop, trim, segments, voiceId, backgroundId, userId, 
        appName, appDescription, scriptRules, stylePrompt, disableZoom,
        videoType, tutorialGoal
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};