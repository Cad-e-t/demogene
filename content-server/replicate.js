
import Replicate from "replicate";
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { writeFile, readFile, unlink } from 'fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const replicateClient = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function stripAudio(buffer) {
    const tempId = uuidv4();
    const inputPath = path.join(os.tmpdir(), `in_${tempId}.mp4`);
    const outputPath = path.join(os.tmpdir(), `out_${tempId}.mp4`);
    
    await writeFile(inputPath, buffer);
    
    await new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', ['-y', '-i', inputPath, '-c:v', 'copy', '-an', outputPath]);
        let errLog = '';
        proc.stderr.on('data', data => { errLog += data.toString(); });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg failed with code ${code}: ${errLog}`));
        });
        proc.on('error', err => reject(err));
    });
    
    const outBuffer = await readFile(outputPath);
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    return outBuffer;
}

export const VIDEO_MODEL_FAST = "prunaai/p-video";
export const VIDEO_MODEL_ULTRA = "xai/grok-imagine-video";

export async function generateVideo(imageUrl, animationPrompt, modelType = 'fast', aspectRatio = "16:9") {
  const model = modelType === 'ultra' ? VIDEO_MODEL_ULTRA : VIDEO_MODEL_FAST;
  console.log(`[Replicate] Generating video with ${model}...`);
  
  let input = {};
  if (modelType === 'ultra') {
    input = {
      prompt: animationPrompt || 'Cinematic, high quality, realistic',
      aspect_ratio: aspectRatio,
      image: imageUrl,
      duration: 4
    };
  } else {
    input = {
      image: imageUrl,
      prompt: animationPrompt || 'Cinematic, high quality, realistic',
      prompt_upsampling: false,
      duration: 4
    };
  }

  const output = await replicateClient.run(model, { input });
    
  const chunks = [];
  for await (const chunk of output) {
      chunks.push(Buffer.from(chunk));
  }
  
  let resultBuffer = Buffer.concat(chunks);
  
  if (modelType === 'fast') {
      try {
          console.log(`[Replicate] Stripping audio from ${modelType} video...`);
          resultBuffer = await stripAudio(resultBuffer);
      } catch (err) {
          console.error(`[Replicate] Failed to strip audio:`, err);
      }
  }
  
  return resultBuffer;
}
