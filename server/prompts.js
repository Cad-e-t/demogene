

export const getVideoAnalysisPrompt = (appDescription, scriptRules) => `
You are analyzing a screen recording of a software demo and must produce three outputs in one pass:

Video segmentation (optimized for zoom-and-hold visual effects)

Gradient background recommendation

A polished Hook → Body → CTA script

────────────────────────────────────────────────────────

Segment the video into chronological, narrative-driven steps
────────────────────────────────────────────────────────

Create high-level demo segments that map to the "Action → Result" workflow.

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

For multi-step actions (e.g., click then type): Cover the full duration of the activity until the result appears.

For instant actions: Do NOT set to 0. Set a minimum "smoothness buffer" (e.g., 0.5s – 1.0s) to allow the click animation to register visually before the camera zooms out.

────────────────────────────────────────────────────────
2. Recommend the gradient background
────────────────────────────────────────────────────────

Based on dominant UI colors in the viewport:

Select a soft two-color gradient.

Maintain 20–30% contrast.

Shift hue ±20–40° from the dominant UI color.

Keep saturation 20–50%.

Avoid matching accent colors; only complement them.

Use valid HEX codes.

Return:

{
"start_color": "#RRGGBB",
"end_color": "#RRGGBB",
"style": "vertical" or "radial"
}

────────────────────────────────────────────────────────
3. Generate the full video script (Hook → Body → CTA)
────────────────────────────────────────────────────────

Inputs:

Segments from section 1.

App description:   

${appDescription}

Script Rules:

${scriptRules}

────────────────────────────────────────────────────────
Final Combined Output Format (Strict)
────────────────────────────────────────────────────────

The number of segments must exactly match the number of script_lines.

{
"background_gradient": {
"start_color": "#000000",
"end_color": "#333333",
"style": "radial"
},

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
"end_time": "00:10.000",
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

export const VIDEO_ANALYSIS_NO_SCRIPT_PROMPT = `
You are analyzing a screen recording of a software demo and must produce two outputs in one pass:

Video segmentation (optimized for zoom-and-hold visual effects)

Gradient background recommendation

────────────────────────────────────────────────────────

Segment the video into chronological, narrative-driven steps
────────────────────────────────────────────────────────

Create high-level demo segments that map to the "Action → Result" workflow.

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

For multi-step actions (e.g., click then type): Cover the full duration of the activity until the result appears.

For instant actions: Do NOT set to 0. Set a minimum "smoothness buffer" (e.g., 0.5s – 1.0s) to allow the click animation to register visually before the camera zooms out.

────────────────────────────────────────────────────────
2. Recommend the gradient background
────────────────────────────────────────────────────────

Based on dominant UI colors in the viewport:

Select a soft two-color gradient.

Maintain 20–30% contrast.

Shift hue ±20–40° from the dominant UI color.

Keep saturation 20–50%.

Avoid matching accent colors; only complement them.

Use valid HEX codes.

Return:

{
"start_color": "#RRGGBB",
"end_color": "#RRGGBB",
"style": "vertical" or "radial"
}

────────────────────────────────────────────────────────
Final Combined Output Format (Strict)
────────────────────────────────────────────────────────

The number of segments must exactly match the number of script_lines.

{
"background_gradient": {
"start_color": "#000000",
"end_color": "#333333",
"style": "radial"
},

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
"end_time": "00:10.000",
"purpose": "Observing the dashboard results",
"mouse_activity": null
}
],
]
}
}
`;
