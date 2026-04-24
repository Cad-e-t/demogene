
import Replicate from "replicate";
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const replicateClient = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const VIDEO_MODEL = "minimax/video-01";

export async function generateVideo(segmentId, imageUrl, animationPrompt) {
  console.log(`[Replicate] Generating video for segment ${segmentId}`);
  
  // Usage of minimax/video-01 on Replicate
  // input: { prompt: "...", first_frame_image: "..." }
  const output = await replicateClient.run(VIDEO_MODEL, {
    input: {
      prompt: animationPrompt,
      first_frame_image: imageUrl
    }
  });

  const videoUrlSource = Array.isArray(output) ? output[0] : output;
  if (!videoUrlSource) throw new Error("Video generation failed: No output URL");

  // Download video and upload to R2
  const response = await fetch(videoUrlSource);
  const buffer = await response.arrayBuffer();
  
  const key = `content/videos/${segmentId}_${uuidv4()}.mp4`;
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: Buffer.from(buffer),
    ContentType: 'video/mp4'
  }));

  const finalVideoUrl = `${R2_PUBLIC_URL}/${key}`;

  // Update DB
  const { error } = await supabase.from('content_segments')
    .update({ image_url: finalVideoUrl })
    .eq('id', segmentId);

  if (error) throw error;

  return finalVideoUrl;
}
