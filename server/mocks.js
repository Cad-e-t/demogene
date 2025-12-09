export const MOCK_AUDIO_URL = "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/raw-screen-upload/download%20(1).wav";

export const MOCK_ANALYSIS_RESULT = {
  "background_gradient": {
    "start_color": "#1A1D2A",
    "end_color": "#2C2A4A",
    "style": "radial"
  },
  "segments": [
    {
      "start_time": "00:00.000",
      "end_time": "00:08.730",
      "purpose": "User searches for a specific startup.",
      "mouse_activity": {
        "timestamp": "00:04.760",
        "coordinates": {
          "x": 0.43,
          "y": 0.46
        },
        "hold_duration": 3.5
      }
    },
    {
      "start_time": "00:08.730",
      "end_time": "00:20.610",
      "purpose": "User reviews the startup's revenue dashboard.",
      "mouse_activity": null
    },
    {
      "start_time": "00:20.610",
      "end_time": "00:24.030",
      "purpose": "User navigates to the startup's external website.",
      "mouse_activity": {
        "timestamp": "00:20.610",
        "coordinates": {
          "x": 0.8,
          "y": 0.19
        },
        "hold_duration": 1.0
      }
    },
    {
      "start_time": "00:24.030",
      "end_time": "00:54.400",
      "purpose": "User initiates adding a new startup to the database.",
      "mouse_activity": {
        "timestamp": "00:24.890",
        "coordinates": {
          "x": 0.64,
          "y": 0.46
        },
        "hold_duration": 24.0
      }
    },
    {
      "start_time": "00:54.400",
      "end_time": "01:00.040",
      "purpose": "User customizes the new startup's public profile.",
      "mouse_activity": {
        "timestamp": "00:58.850",
        "coordinates": {
          "x": 0.69,
          "y": 0.89
        },
        "hold_duration": 1.2
      }
    },
    {
      "start_time": "01:00.040",
      "end_time": "01:11.750",
      "purpose": "Observing the final data synchronization and page generation.",
      "mouse_activity": null
    }
  ],
  "script": {
    "script_lines": [
      {
        "segment_index": 0,
        "type": "hook",
        "narration": "Access a transparent database of verified startup revenues to analyze real-world performance metrics."
      },
      {
        "segment_index": 1,
        "type": "body",
        "narration": "Review verified total revenue, monthly recurring revenue, and historical growth trends to assess performance."
      },
      {
        "segment_index": 2,
        "type": "body",
        "narration": "Seamlessly navigate directly to the startup's website for further research."
      },
      {
        "segment_index": 3,
        "type": "body",
        "narration": "Securely connect your payment provider to automatically list your startup and verify its revenue."
      },
      {
        "segment_index": 4,
        "type": "body",
        "narration": "Customize your public profile with your company logo, description, and website to build your brand presence."
      },
      {
        "segment_index": 5,
        "type": "cta",
        "narration": "Build investor trust and attract acquisition opportunities by showcasing your verified revenue on TrustMRR."
      }
    ]
  }
};