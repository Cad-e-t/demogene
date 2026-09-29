
import Replicate from "replicate";

const replicateClient = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const VIDEO_MODEL_ULTRA = "xai/grok-imagine-video";

export async function generateVideo(imageUrl, animationPrompt, modelType = 'ultra', aspectRatio = "16:9", duration = 4) {
  const model = VIDEO_MODEL_ULTRA;
  console.log(`[Replicate] Generating video with ${model}...`);
  
  const input = {
    prompt: animationPrompt || 'Cinematic, high quality, realistic',
    aspect_ratio: aspectRatio,
    image: imageUrl,
    duration: duration
  };

  const output = await replicateClient.run(model, { input });
    
  const chunks = [];
  for await (const chunk of output) {
      chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}
