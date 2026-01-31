
export const getVideoAnalysisPrompt = (appName, appDescription, scriptRules, totalDuration) => `

You are analyzing a screen recording of a software demo and must produce two outputs in one pass:

- Video segmentation (optimized for zoom-and-hold visual effects)
- A polished Hook → Body → CTA script

─────────────────────────────────────────────────────
1. Segment the video into chronological, narrative-driven steps
────────────────────────────────────────────────────────

Create high-level demo segments that map to the "Action → Result" workflow.

STRICT CONTINUITY RULES (NO CUTTING):
- The segments MUST cover the ENTIRE video duration without gaps or omissions.
- For every segment (n), its end_time MUST be exactly the start_time of segment (n+1).
- DO NOT skip any parts of the video. If nothing is happening, create a segment with "mouse_activity": null and describe it as "Observing the interface" or "Waiting for process".

Segmentation Logic:
Workflow Focus: Each segment represents a specific user goal (e.g., "Searching for a company").
Structure: A segment consists of Contributing Actions (Clicking, Typing, Selecting) followed by a Result (List appears, Page loads).

Zoom & Hold Strategy:
The Mouse Activity marks the start of the action (the initial click).
The Hold Duration keeps the camera zoomed in to capture the subsequent "contributing actions" (like typing or filling a form) that occur immediately after the click.
The camera "releases" (zooms out) only when the Result appears.

Rules:
1:1 Mapping: Every segment corresponds to exactly one script line.
Single Key Action: Identify the primary click that initiates the segment's workflow.
Idle Segments: If a segment is purely observational (no interaction), mouse_activity must be null.

Each segment must include:
start_time
end_time
purpose: The functional goal accomplished.
mouse_activity: (Object or null)
timestamp: When the primary initial click happens.
coordinates: { x, y } (normalized 0–1).
hold_duration: (Float in seconds). The time to hold the zoom after the initial click.

────────────────────────────────────────────────────────
2. Generate the full video script (Hook → Body → CTA)
────────────────────────────────────────────────────────

Inputs:
Segments from section 1.
App Name: ${appName}
App description:   
${appDescription}

Script Rules:
${scriptRules}

────────────────────────────────────────────────────────
Final Combined Output Format (Strict)
────────────────────────────────────────────────────────
{
"segments": [
{
"start_time": "00:00.000",
"end_time": "00:05.500",
"purpose": "User searches for a company",
"mouse_activity": {
"timestamp": "00:01.200",
"coordinates": { "x": 0.5, "y": 0.5 },
"hold_duration": 3.0
}
},
{
"start_time": "00:05.500",
"end_time": "03:00.000",
"purpose": "Observing the dashboard results",
"mouse_activity": null
}
],

"script": {
"script_lines": [
{
"segment_index": 0,
"type": "hook",
"narration": "Start by..."
},
{
"segment_index": 1,
"type": "body",
"narration": "See how..."
}
]
}
}
`;





export const getHowToVideoAnalysisPrompt = (appName, appDescription, tutorialGoal, scriptRules) => `
You are analyzing a screen recording of a software tutorial and must produce two outputs in one pass:

- Video segmentation (optimized for zoom-and-hold visual effects)
- A clear, instructional Intro → Steps → Outcome script


────────────────────────────────────────────────────────

1. Segment the video into chronological, narrative-driven steps
────────────────────────────────────────────────────────

Create high-level tutorial segments that map to the "Action → Result" workflow.

STRICT CONTINUITY RULES (NO CUTTING):
- The segments MUST cover the ENTIRE video duration without gaps or omissions.
- For every segment (n), its end_time MUST be exactly the start_time of segment (n+1).
- DO NOT skip any parts of the video. If nothing is happening, create a segment with "mouse_activity": null and describe it as "Observing the interface" or "Waiting for process".


Segmentation Logic:

Workflow Focus: Each segment represents a specific learner task contributing directly to the tutorial goal.

Structure: A segment consists of Contributing Actions (Clicking, Typing, Selecting) followed by a Result (UI changes, element appears).

Zoom & Hold Strategy:

The Mouse Activity marks the start of the action (the initial click).

The Hold Duration keeps the camera zoomed in to capture the subsequent "contributing actions" (like typing or filling a form) that occur immediately after the click.

The camera "releases" (zooms out) only when the Result appears.

Rules:

1:1 Mapping: Every segment corresponds to exactly one script line.

Single Key Action: Identify the primary click that initiates the segment's workflow.

Idle Segments: If a segment is purely observational (no interaction), mouse_activity must be null.

Each segment must include:

start_time

end_time

purpose: The learner task being accomplished.

mouse_activity: (Object or null)

timestamp: When the primary initial click happens.

coordinates: { x, y } (normalized 0–1).

hold_duration: (Float in seconds). The time to hold the zoom after the initial click.

For multi-step actions (e.g., click then type): Cover the full duration of the activity until the result appears.

For instant actions: Do NOT set to 0. Set a minimum "smoothness buffer" (e.g., 0.5s – 1.0s) to allow the click animation to register visually before the camera zooms out.


────────────────────────────────────────────────────────
2. Generate the full video script (Intro → Steps → Outcome)
────────────────────────────────────────────────────────

Inputs:

Segments from section 1.

App Name: ${appName}

App description (context only):   

${appDescription}

Tutorial Goal (primary narrative driver):

${tutorialGoal}

Script Rules:

${scriptRules}

- The first script line MUST be an intro that states the tutorial goal.
- Use imperative, step-by-step instructional language.
- Do NOT explain what the app is or describe unrelated features.
- Do NOT use marketing or benefit-oriented language.
- Each script line must directly advance the Tutorial Goal.


────────────────────────────────────────────────────────
Final Combined Output Format (Strict)
────────────────────────────────────────────────────────
{
"segments": [
{
"start_time": "00:00.000",
"end_time": "00:05.500",
"purpose": "Create a new design file",
"mouse_activity": {
"timestamp": "00:01.200",
"coordinates": { "x": 0.5, "y": 0.5 },
"hold_duration": 3.0
}
},
{
"start_time": "00:05.500",
"end_time": "00:10.000",
"purpose": "Observe the blank canvas",
"mouse_activity": null
}
],

"script": {
"script_lines": [
{
"segment_index": 0,
"type": "intro",
"narration": "In this tutorial, you will create a new design file."
},
{
"segment_index": 1,
"type": "step",
"narration": "Review the blank canvas to confirm the file is ready."
}
]
}
}
`;

