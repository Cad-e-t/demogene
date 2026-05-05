import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

async function run() {
    const bundleLocation = await bundle({
        entryPoint: path.resolve("./content-server/demo-maker/remotion-root.tsx"),
        webpackOverride: (config) => config
    });
    console.log("Bundle done =>", bundleLocation);

    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "MyComp",
    });

    await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: `out.mp4`,
    });
    console.log("Render done!");
}
run().catch(console.error);
