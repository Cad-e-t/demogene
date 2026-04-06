import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, R2_BUCKET, R2_PUBLIC_URL } from '../storage.js';
import { supabase } from './supabase.js';
import { runDemoProcessing, runDemoExport } from './background-job.js';
import { generateImage } from '../gemini.js';

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

export const exportDemoVideo = async (req, res) => {
    try {
        const { projectId, userId } = req.body;
        if (!userId || !projectId) {
            return res.status(400).json({ error: 'Missing userId or projectId' });
        }

        // 1. Charge Credit
        const { error: chargeError } = await supabase.rpc('charge_credit', { p_user_id: userId });
        if (chargeError) {
            return res.status(402).json({ error: 'Insufficient credits.' });
        }

        // 2. Update status
        await supabase.from('demo_projects').update({ status: 'rendering' }).eq('id', projectId);

        res.status(202).json({ message: 'Export started' });

        // 3. Run background export
        runDemoExport({ projectId, userId });

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const processVideo = async (req, res) => {
  try {
    // Note: videoId here refers to the SOURCE video uploaded by the user
    let { videoId, hookText, bodyText, voiceId, hookStyle, userId, aspectRatio } = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    }
    
    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    // 1. Charge Credit Immediately (Prevents Race Condition)
    const { error: chargeError } = await supabase.rpc('charge_credit', { p_user_id: userId });
    
    if (chargeError) {
        console.error("Credit deduction failed:", chargeError);
        return res.status(402).json({ error: 'Insufficient credits. Please purchase a pack.' });
    }

    // 2. Fetch Source Video Details
    const { data: sourceVideo, error: sourceError } = await supabase
        .from('videos')
        .select('input_video_url, title')
        .eq('id', videoId)
        .single();

    if (sourceError || !sourceVideo) {
        // Refund credit if processing cannot proceed
        await supabase.rpc('grant_credits_from_purchase', {
             p_user_id: userId,
             p_credits_to_add: 1,
             p_description: 'Refund: Source video not found',
             p_metadata: { videoId }
        });
        return res.status(404).json({ error: 'Original video not found' });
    }

    // 3. Create a NEW Record for the "Output" (Project)
    const newVideoId = uuidv4();
    const newTitle = sourceVideo.title.includes('(Demo)') ? sourceVideo.title : `${sourceVideo.title} (Demo)`;

    const { error: insertError } = await supabase
        .from('demo_projects')
        .insert({
            id: newVideoId,
            user_id: userId,
            title: newTitle,
            video_url: sourceVideo.input_video_url, // Copy the source URL
            status: 'processing',
            voice_id: voiceId,
            hook_style: { style: hookStyle },
            aspect_ratio: aspectRatio || '16:9'
        });
    
    if (insertError) {
        console.error("Failed to create new project record:", insertError);
        // Refund credit
        await supabase.rpc('grant_credits_from_purchase', {
             p_user_id: userId,
             p_credits_to_add: 1,
             p_description: 'Refund: Project creation failed',
             p_metadata: { error: insertError.message }
        });
        return res.status(500).json({ error: 'Failed to create project record' });
    }

    // 4. Respond with the NEW ID
    res.status(202).json({ 
        message: 'Video processing started in background', 
        videoId: newVideoId 
    });

    // 5. Trigger Asynchronous Processing with the NEW ID
    runDemoProcessing({
        projectId: newVideoId,
        sourceVideoUrl: sourceVideo.input_video_url,
        hookText,
        bodyText,
        voiceId,
        hookStyle,
        userId
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const generateHookUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: 'Missing fileName or fileType' });

    const key = `hook_assets/${uuidv4()}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

export const generateHookImage = async (req, res) => {
  try {
    const { prompt, aspectRatio, userId } = req.body;
    if (!prompt || !userId) return res.status(400).json({ error: 'Missing prompt or userId' });

    // Deduct 4 credits
    const { error: chargeError } = await supabase.rpc('charge_creator_credits', {
        p_user_id: userId,
        p_amount: 4,
        p_description: 'AI Image Generation for Hook'
    });
    if (chargeError) {
        return res.status(402).json({ error: 'Insufficient credits.' });
    }

    const base64Image = await generateImage(prompt, aspectRatio || '16:9');
    const buffer = Buffer.from(base64Image, 'base64');
    
    const key = `hook_assets/${uuidv4()}.png`;
    await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'image/png'
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    res.json({ publicUrl, key });
  } catch (err) {
    console.error("AI Image Generation Error:", err);
    res.status(500).json({ error: "Failed to generate image" });
  }
};

export const deleteHookAsset = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    if (url.startsWith(baseUrl)) {
        const key = url.replace(baseUrl, '');
        await s3.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key
        }));
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Asset Error:", err);
    res.status(500).json({ error: "Failed to delete asset" });
  }
};