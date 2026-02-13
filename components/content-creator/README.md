# Content Creator App

## Overview
The **Content Creator** is a specialized AI-powered application within the ProductCam ecosystem designed to transform text prompts into viral short videos. Unlike the main ProductCam flow which enhances existing screen recordings, Content Creator builds videos entirely from scratch using generative AI for visuals (images), audio (narration), and scriptwriting.

It is designed for creators, marketers, and founders to rapidly produce:
- Short stories (horror, history, fun facts)
- Product concept explainers
- Social media shorts (TikTok, Reels, Shorts)
- Visual narratives

## Architecture & Tech Stack

### Frontend
- **Framework**: React (integrated into the main ProductCam Vite application).
- **State Management**: React State + Supabase Realtime subscriptions for live status updates.
- **Styling**: Tailwind CSS for responsive and modern UI.
- **Key Components**:
  - `ContentApp`: The main container handling routing and authentication for the sub-app.
  - `ContentDashboard`: The creation hub for entering prompts and configuring generation settings.
  - `ContentEditor`: A sophisticated interface to review segments, edit text, and regenerate or edit images using AI.
  - `ContentProjects`: A library of draft and completed projects.
  - `ContentStories`: A gallery for viewing and downloading final rendered videos.

### Backend (`content-server`)
A dedicated Node.js/Express microservice (distinct from the main video processor) handling the generative pipeline.
- **Runtime**: Node.js
- **Video Processing**: **FFmpeg** (spawned via `child_process`) is used for complex zoom/pan effects ("Ken Burns" style), image sequencing, audio normalization, and final assembly.
- **Storage**: **Cloudflare R2** (S3 compatible) handles the storage of generated assets (images) and final video outputs.
- **Database**: **Supabase** (PostgreSQL) manages user data, projects, segments, and credit transactions.

### AI Models (Google GenAI SDK)
The app leverages the latest Gemini models for different stages of the pipeline:
- **Scripting & Logic**: `gemini-2.5-flash` or `gemini-3-pro-preview` for high-quality narrative segmentation.
- **Image Generation**: 
  - **Fast Mode**: `imagen-4.0-fast-generate-001` for speed and efficiency.
  - **Ultra Mode**: `gemini-2.5-flash-image` for high-fidelity visuals.
- **Image Editing**: `gemini-2.5-flash-image` allows users to modify generated images via natural language prompts.
- **Text-to-Speech**: `gemini-2.5-flash-preview-tts` generates human-like voiceovers with specific emotional tones.

## How It Works

### 1. Generation Phase
1.  **Prompt Analysis**: The user submits a text prompt (e.g., "A day in the life of a cyberpunk detective").
2.  **Segmentation**: The backend uses Gemini to break the story into logical "segments" based on the selected **Visual Density** (Balanced, Rich, or Low). Each segment contains a portion of the narration and a detailed, style-aware AI image prompt.
3.  **Parallel Image Generation**: The system triggers parallel requests to generate images for each segment based on the configured **Image Style** (e.g., Anime, Cinematic) and **Picture Quality**.
4.  **Database Sync**: A project draft is created in Supabase, and segments are populated in real-time as images complete.

### 2. Editing Phase
Users land in the **Content Editor** interface where they can refine the AI's output:
- **Review**: Scroll through the storyboard to see how the visual narrative flows.
- **Regenerate**: If an image doesn't match the vision, the user can click "Retry" to generate a fresh variation.
- **AI Edit**: Users can perform targeted edits (e.g., "Change the sky to purple") using Gemini's image editing capabilities.
- **Text Refinement**: Narration text can be manually edited to perfect the script.

### 3. Rendering Phase
Once the storyboard is finalized, the user initiates the video generation:
1.  **Full Audio**: The backend generates a cohesive voiceover for the entire script using Gemini TTS, ensuring natural flow between segments.
2.  **Timing Calculation**: The system aligns visual duration exactly with the spoken audio for each segment.
3.  **Visual Effects**: FFmpeg applies dynamic camera moves (Zoom Pulse, Slide Flow, Handheld Walk, etc.) to the static images to bring them to life.
4.  **Assembly**: Visuals and audio are stitched together, loudness is normalized to -16 LUFS (social standard), and the final MP4 is uploaded to storage.

## Usage Guide

1.  **Access**: Navigate to `/content-creator` (or login via the main app and select the Content Creator tool).
2.  **Credits**: The app operates on a credit system managed via Dodo Payments. Ensure you have sufficient credits in the **Dashboard** or **Billing** tab.
3.  **Create**:
    - **Prompt**: Enter a creative idea or story.
    - **Aspect Ratio**: Select **9:16** (Vertical/Mobile) or **16:9** (Landscape/Desktop).
    - **Style**: Choose an aesthetic (e.g., Realistic, Watercolor, 3D Render).
    - **Voice**: Select a narrator and a **Narration Style** (e.g., "Charisma Dynamo", "Spooky").
    - **Visual Density**: Control the pacing (how often images change).
    - Click **Generate**.
4.  **Refine**:
    - In the editor, review the generated segments.
    - Use the **Retry** icon to swap out images.
    - Use the **Magic Wand** icon to edit an image with a text command.
5.  **Finalize**:
    - Click **Generate Video**.
    - The process runs in the background; you can navigate away or start a new project.
    - Once processing is complete, view and download your video in the **Stories** tab.

## Local Development
To run the content-creator backend locally:
1.  Navigate to the `content-server/` directory.
2.  Install dependencies: `npm install`.
3.  Configure `.env` with:
    - `API_KEY` (Google Gemini)
    - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
    - `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
4.  Start the server: `node index.js`.
5.  The frontend is pre-configured to communicate with the server (default `http://localhost:8001` in dev).
