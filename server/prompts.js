
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
The llm should determine the center of attention for each segments.
The Coordinates (X, Y): These no longer represent a single click. They represent the center point of the general area the user is working in during that segment. This is where the zoom will be applied.

Rules:
1:1 Mapping: Every segment corresponds to exactly one script line.
Center of Attention: Identify the primary area of focus for the segment's workflow.
Idle Segments: If a segment is purely observational (no interaction) and requires no zoom, focus_area must be null.

Each segment must include:
start_time
end_time
purpose: The functional goal accomplished.
focus_area: (Object or null)
x: (Float normalized 0-1) The center point X coordinate of the general area the user is working in.
y: (Float normalized 0-1) The center point Y coordinate of the general area the user is working in.

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
"focus_area": {
"x": 0.5,
"y": 0.5
}
},
{
"start_time": "00:05.500",
"end_time": "03:00.000",
"purpose": "Observing the dashboard results",
"focus_area": null
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

The llm should determine the center of attention for each segments.

The Coordinates (X, Y): These no longer represent a single click. They represent the center point of the general area the user is working in during that segment. This is where the zoom will be applied.

Rules:

1:1 Mapping: Every segment corresponds to exactly one script line.

Center of Attention: Identify the primary area of focus for the segment's workflow.

Idle Segments: If a segment is purely observational (no interaction) and requires no zoom, focus_area must be null.

Each segment must include:

start_time

end_time

purpose: The learner task being accomplished.

focus_area: (Object or null)

x: (Float normalized 0-1) The center point X coordinate of the general area the user is working in.

y: (Float normalized 0-1) The center point Y coordinate of the general area the user is working in.


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
"focus_area": {
"x": 0.5,
"y": 0.5
}
},
{
"start_time": "00:05.500",
"end_time": "00:10.000",
"purpose": "Observe the blank canvas",
"focus_area": null
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

