import fs from 'fs';

let content = fs.readFileSync('content-server/demo-maker/background-job.js', 'utf8');

const startIndex = content.indexOf('export async function runDemoExport');
if (startIndex === -1) {
    console.error("Function not found");
    process.exit(1);
}

const prefix = content.slice(0, startIndex);

const newFunction = `export async function runDemoExport({ projectId, userId, motionGraphicsEnabled, exportQuality }) {
    console.log(\`[Demo Export] Starting for Project: \${projectId}\`);
    const filesToDelete = [];
    const workDir = path.join(TEMP_DIR, \`demo_export_\${uuidv4()}\`);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

    try {
        const { data: project } = await supabase.from('demo_projects').select('*').eq('id', projectId).single();
                
        if (!project || !project.voice_path) {
            throw new Error("Missing assets for export");
        }

        const audioUrl = project.voice_path;
        const filesData = project.files_data || [];
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

        console.log(\`[Demo Export] Using Remotion Bundler. Duration: \${durationInFrames} frames, Size: \${width}x\${height}\`);

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
                durationInFrames
            }
        });

        // Override composition parameters
        composition.durationInFrames = durationInFrames;
        composition.width = width;
        composition.height = height;

        const finalPath = path.join(workDir, \`final.mp4\`);

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
                durationInFrames
            }
        });

        // Upload Final Video
        const finalBuffer = fs.readFileSync(finalPath);
        const finalKey = \`content/stories/\${uuidv4()}.mp4\`;
        
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: finalKey,
            Body: finalBuffer,
            ContentType: 'video/mp4'
        }));
        
        const videoUrl = \`\${R2_PUBLIC_URL}/\${finalKey}\`;

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
        
        console.log(\`[Demo Export] Completed for Project: \${projectId}\`);
    } catch (error) {
        console.error(\`[Demo Export] Error for Project \${projectId}:\`, error);
        await supabase.from('demo_projects').update({ status: 'failed' }).eq('id', projectId);
        await supabase.from('content_stories').update({ status: 'failed' }).eq('demo_project_id', projectId);
    } finally {
        cleanup(filesToDelete);
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    }
}
`;

fs.writeFileSync('content-server/demo-maker/background-job.js', prefix + newFunction);
console.log("Replaced successfully");
