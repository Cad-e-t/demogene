import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

export async function generateMotionGraphicsWaitlet(scriptBreakdown, transcription, width, height, workDir, audioDur) {
    const bundleLocation = await bundle({
        entryPoint: path.resolve("./demo-maker/remotion-root.tsx"),
        webpackOverride: (config) => config
    });
    
    // Convert chunks to Remotion friendly format (start, end, text, type)
    const tWords = transcription.words.filter(w => w.text.trim().length > 0);
    let tIdx = 0;
    const chunks = [];
    
    for (const chunk of scriptBreakdown) {
        if (!chunk.text.trim()) continue;
        const chunkWords = chunk.text.trim().split(/\s+/);
        let startMs = null;
        let endMs = null;
        for (let i = 0; i < chunkWords.length; i++) {
            if (tIdx < tWords.length) {
                const w = tWords[tIdx];
                if (startMs === null) startMs = w.start;
                endMs = w.end;
                tIdx++;
            }
        }
        if (startMs !== null && endMs !== null) {
            chunks.push({
                text: chunk.text,
                type: chunk.type,
                start: startMs / 1000,
                end: endMs / 1000,
                duration: (endMs - startMs) / 1000
            });
        }
    }

    const durationInFrames = Math.ceil(audioDur * 30);
    
    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "MotionGraphics",
        inputProps: {
            chunks,
            videoDuration: audioDur
        }
    });

    // Override length and dimensions
    composition.durationInFrames = durationInFrames;
    composition.width = width;
    composition.height = height;

    const outPath = path.join(workDir, 'remotion_overlay.mp4');

    await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: outPath,
        inputProps: { chunks, videoDuration: audioDur }
    });

    return outPath;
}
