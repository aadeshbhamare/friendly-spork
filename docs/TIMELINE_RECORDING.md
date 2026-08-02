Timeline-based recording

This document explains the client-side timeline recorder implemented in branch `fix/timeline-recorder`.

What was added

- src/components/TimelineEditor.tsx — a small editor UI to add simple clips (shape/text), upload audio, paste captions (SRT), preview, and record.
- src/components/CanvasTimelinePlayer.tsx — the canvas-based renderer that plays the timeline and draws caption overlays.
- src/components/RecorderControls.tsx — records the canvas + audio via MediaRecorder and downloads a WebM.

How it works

- The CanvasTimelinePlayer drives rendering using requestAnimationFrame and draws the active clip at each timestamp. Captions are drawn from the parsed SRT segments (or provided segments).
- RecorderControls uses canvas.captureStream() and audio.captureStream() to combine tracks and record via MediaRecorder.

Limitations & next steps

- Currently clip types are simple shapes and static text for demonstration. For production-quality HD animations, integrate Lottie (lottie-web) rendered to canvas or pre-render high-quality clips to canvas.
- For server-quality MP4 output, record clips and stitch/transcode on server using ffmpeg.
- For automatic transcription, add a server endpoint to run OpenAI Whisper, AssemblyAI, or similar and return segments (start/end/text). The UI already supports pasting an SRT file.

Install dependencies

This POC doesn't require additional runtime dependencies beyond React, but for better animations and Lottie support install:

npm install lottie-web @lottiefiles/react-lottie-player gsap

To transcode or stitch on server:

npm install @ffmpeg/ffmpeg

How to test locally

1. Checkout branch `fix/timeline-recorder`.
2. Start dev server.
3. Open the page where you render TimelineEditor (add a route or import it into an existing page).
4. Add clips, upload an audio file, optionally paste an SRT, preview, and click "Record timeline". A WebM file will download when recording completes.

If you want, I can:
- Replace simple clip renderers with Lottie canvas rendering (requires adding lottie-web usage).
- Add server-side stitching & MP4 transcoding using ffmpeg (server endpoint).
- Integrate a transcription provider to produce SRT automatically from uploaded audio.

Tell me which of these to implement next.
