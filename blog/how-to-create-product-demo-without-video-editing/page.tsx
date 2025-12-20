
import React from 'react';

export const PostContent: React.FC = () => {
    return (
        <>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">How to Create a Product Demo Without Video Editing</h1>
            <div className="prose prose-lg max-w-none text-gray-700 font-medium leading-relaxed">
                <p className="text-xl text-gray-600 mb-10">
                    Video editing is the main reason most teams delay or avoid creating product demos. Timelines turn a simple screen capture into hours of work. But editing isn’t required to produce a clear, professional demo.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Why builders default to editing for product demos</h2>
                <ul className="list-disc pl-6 mb-8 space-y-2">
                    <li>Raw recordings feel unprofessional</li>
                    <li>Silence feels awkward</li>
                    <li>Important moments are easy to miss</li>
                </ul>
                <p className="mb-6">So people jump straight to editors.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What a demo actually needs</h2>
                <p className="mb-6">A demo doesn’t need flashy transitions. A product demo needs a structured walkthrough with clarity and pacing. These make watchers feel like they are using your tool.</p>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Editing vs Automation</h2>
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="font-bold mb-3">Editing</h3>
                        <ul className="text-sm space-y-1">
                            <li>Manual</li>
                            <li>Time-consuming</li>
                            <li>Flashy but lacks communication</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <h3 className="font-bold mb-3 text-green-800">Automation</h3>
                        <ul className="text-sm space-y-1 text-green-800">
                            <li>Applies structure automatically</li>
                            <li>Generates narration</li>
                            <li>Highlights key actions</li>
                            <li>Produces consistent output</li>
                        </ul>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Who this is for</h2>
                <p className="mb-6">This approach is ideal for Founders sharing their tool on the internet, small teams ready to launch, and SaaS products.</p>
                <p className="mb-6">It is not ideal for brand commercials or cinematic marketing videos.</p>

                <p className="mt-10 pt-10 border-t border-gray-100 text-center font-bold text-gray-900">
                    Create a product demo without editing. <br/>
                    Upload your screen recording and let ProductCam handle the rest.
                </p>
            </div>
        </>
    );
};
