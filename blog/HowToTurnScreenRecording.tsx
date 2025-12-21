import React from 'react';

export const HowToTurnScreenRecording = () => (
  <div className="space-y-8">
    <p className="text-lg">
      Most product demos start the same way:
      someone records their screen while clicking through the app.
    </p>

    <p className="text-lg">
      The problem is that raw screen recordings are rarely usable as demos. They’re too long, unfocused, silent, or confusing to new viewers.
    </p>

    <p className="text-lg">
      This guide shows how people turn screen recordings into clear product demos.
    </p>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">What makes a good demo</h2>
      <p className="mb-4">A product demo needs:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>A clear beginning and ending</li>
        <li>Context for why actions are happening</li>
        <li>Focus on key moments, not every click</li>
        <li>Pacing that matches a first-time viewer</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">The traditional workflow</h2>
      <p className="mb-4">Most teams do this:</p>
      <p className="mb-4">Record themselves using the product recording tools - with developer by the side (picture-in-picture) and app interface as the background</p>
      <p className="mb-4">This can work but the video is slow, boring to watch, and sometimes inaudible.</p>
      <p className="mb-4">Some teams hirer editors and have to wait days for the video to be ready before they can launch. The demo in turn ends up flashier then clear since hired editors care more about visuals than the product itself.</p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">A simplified approach</h2>
      <p className="mb-4">A faster way is to use a plain screen recording with clear narration to show how your product works</p>
      <p className="mb-4">Instead of editing manually:</p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        <li>The recording is analyzed</li>
        <li>A script is generated from what’s happening on screen</li>
        <li>Voiceover is added automatically</li>
        <li>Zooms and pacing are applied where attention matters</li>
      </ul>
      <p className="mb-4 font-medium">Productcam follows this approach. You upload a screen recording and receive a polished demo without editing timelines or hiring editors</p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">When this approach works best</h2>
      <p className="mb-4">This works best for:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Launch demos</li>
        <li>Onboarding videos</li>
        <li>Product Hunt demos</li>
        <li>Feature walkthroughs</li>
        <li>Investor pitch</li>
      </ul>
      <p className="mt-6">If someone needs cinematic branding or ads, traditional editing still makes sense.</p>
    </section>

    <section className="bg-gray-50 p-8 rounded-none border-l-4 border-green-500">
      <p className="text-lg font-bold mb-4">Turn your screen recording into a demo automatically.</p>
      <p className="mb-6">Upload your recording and get a narrated, focused product demo in minutes.</p>
      <a href="#/" className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-gray-800 transition">Get started</a>
    </section>
  </div>
);