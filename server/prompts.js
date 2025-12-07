export const VIDEO_ANALYSIS_PROMPT = `
You are analyzing a screen recording of a software demo and must produce three outputs in one pass:
1) Video segmentation
2) Gradient background recommendation
3) A polished Hook → Body → CTA launch/demo script using the segments

────────────────────────────────────────────────────────
1. Segment the video into chronological demo steps
────────────────────────────────────────────────────────
Segment the video into meaningful demo steps, not micro mouse movements.

A demo step is:
* a single user-triggered action that causes a visible change, OR
* a system-generated visual change

Segmentation rules:
* Each segment must represent one clear functional step.
* Ignore minor cursor movement, idle hovering, micro scrolls.
* Only record mouse activity if it triggers a visible step.
* If cursor is not visible, set mouse_activity to null.
* neutral_visual_description: describe only what is visible.
* purpose: describe the functional significance of that step.

Each segment must include:
* start_time
* end_time
* neutral_visual_description
* purpose
* mouse_activity:
  * clicks: array of {type, x, y, time}
  * hover_regions (optional)

Coordinates must be normalized 0–1.
Timestamps must include milliseconds.

────────────────────────────────────────────────────────
2. Recommend the gradient background
────────────────────────────────────────────────────────
Based on the UI’s dominant colors inside the viewport:
* Select a soft two-color gradient.
* Maintain strong contrast without exceeding 20–30%.
* Shift dominant hue ±20–40° to avoid matching the UI.
* Keep saturation low (20–50%).
* Never match the UI’s accent color; only complement it.
* Provide valid HEX colors.

Return:
{
"start_color": "#RRGGBB",
"end_color": "#RRGGBB",
"style": "vertical" or "radial"
}

────────────────────────────────────────────────────────
3. Generate the full video script (Hook → Body → CTA)
────────────────────────────────────────────────────────
Inputs for script generation:
* The segments produced in section 1
* Short app description:
  {The database of verified startup revenues}

Script rules:
* Hook: 1–2 sentences highlighting the product’s core value.
* Body: Describe what happens on-screen using segments chronologically.
  - Do not explain how to perform actions.
  - Focus on the value demonstrated by the visual changes.
* Narration may freely express the product’s value, benefits, outcomes, and why it matters.
* Do NOT call out implementation details (e.g., API keys, integrations, security models, providers, protocols, data sources, setup steps).
* Do NOT mention any specific tools, vendors, or technical processes
* The script should communicate the value proposition, not how the product technically works under the hood.


* CTA: generate a strong closing call-to-action based on the product.
* Keep tone founder-friendly, clear, and concise.
* Suitable for 30–90s launch/demo video.

Output format:
{
"script_lines": [
{
"segment_index": 0,
"type": "hook" | "body" | "cta",
"narration": ""
}
]
}

────────────────────────────────────────────────────────
Final Combined Output Format (strict)
────────────────────────────────────────────────────────

{
"background_gradient": {
"start_color": "#000000",
"end_color": "#333333",
"style": "radial"
},

"segments": [
{
"start_time": "00:00.000",
"end_time": "00:02.150",
"neutral_visual_description": "",
"purpose": "",
"mouse_activity": {
"clicks": [],
"hover_regions": []
}
}
],

"script": {
"script_lines": [
{
"segment_index": 0,
"type": "hook",
"narration": ""
}
]
}
}
`;