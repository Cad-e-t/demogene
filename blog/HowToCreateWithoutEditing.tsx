import React from 'react';

export const HowToCreateWithoutEditing = () => (
  <div className="space-y-8">
    <p className="text-lg">
      Video editing is the main reason most teams delay or avoid creating product demos.
    </p>

    <p className="text-lg">
      Timelines turn a simple screen capture into hours of work.
    </p>

    <p className="text-lg">
      But editing isn’t required to produce a clear, professional demo.
    </p>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Why builders default to editing for product demos</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Raw recordings feel unprofessional</li>
        <li>Silence feels awkward</li>
        <li>Important moments are easy to miss</li>
      </ul>
      <p className="mt-4">So people jump straight to editors.</p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">What a demo actually needs (education)</h2>
      <p className="mb-4">A demo doesn’t need editing</p>
      <p className="mb-4">A product demo needs structured walkthrough with clarity and pacing</p>
      <p className="mb-4">These make watchers feel like they are using your tool</p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Editing vs automation</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold mb-2">Editing:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Manual</li>
            <li>Time-consuming</li>
            <li>Flashy but lacks communication</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Automation:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Applies structure automatically</li>
            <li>Generates narration</li>
            <li>Highlights key actions</li>
            <li>Produces consistent output</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Who this is for</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold mb-2">This approach is ideal for:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Founders sharing their tool on internet</li>
            <li>Small teams ready to launch</li>
            <li>SaaS products</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Not ideal for:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Brand commercials</li>
            <li>Cinematic marketing videos</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="bg-gray-50 p-8 rounded-none border-l-4 border-green-500">
      <p className="text-lg font-bold mb-4">Create a product demo without editing.</p>
      <p className="mb-6">Upload your screen recording and let Productcam handle the rest.</p>
      <a href="https://productcam.site/" className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-gray-800 transition">Get Started</a>
    </section>
  </div>
);