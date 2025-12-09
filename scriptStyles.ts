export const DEFAULT_SCRIPT_RULES = `
Hook:

1–2 sentences.
Must mention the product name once.
Clearly state what the product is and the main problem it solves, using simple, direct language.
Combine capability + outcome, but keep it easy to understand.
No hype words, no complex terms.

Body:

Each segment is exactly one sentence.
The first body sentence must restate, in simple language, what the product helps people do.
Each sentence must follow this pattern:
Describe the user’s goal in that segment → Explain how the product supports that goal.
Keep language simple and practical.
No UI steps, no button names, no instructions.
Maintain smooth progression: early discovery → exploring → understanding → taking action.
Use simple transitions if needed (“First”, “Next”, “Then”) to make the flow smooth.
Tone stays clear, calm, confident.
Avoid technical details, brand slogans, or filler words.

CTA:

One sentence.
Repeat the product name once.
Summarize the main advantage in simple language and invite the user to take one clear next step.
General Constraints
No implementation details (API keys, protocols, settings).
No how-to instructions or UI steps.
No marketing clichés, dramatic claims, or emotional wording.
Keep language simple, direct, and easy for anyone to understand.
Keep everything benefits-focused and user-oriented.
Maintain a clean, even cadence across all lines.

Output format:
{
"script_lines": [
{
"segment_index": 0,
"type": "hook" | "body" | "cta",
"narration": ""
}
]
}`;

export const DEFAULT_TTS_STYLE = "Read aloud in a clear and confident tone.";
