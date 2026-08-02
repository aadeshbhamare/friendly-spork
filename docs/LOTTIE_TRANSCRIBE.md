Add Lottie rendering and AssemblyAI transcription

This change adds:
- Lottie-based clip rendering inside the CanvasTimelinePlayer so timeline clips of type 'lottie' render vector animations to the canvas and are recorded as part of the timeline.
- A server-side transcription endpoint (/api/transcribe) that accepts base64 audio, uploads it to AssemblyAI, requests a transcript with word-level timestamps, polls for completion, and returns grouped segments usable as captions.
- TimelineEditor updates to upload audio and call the auto-transcribe endpoint to populate captions automatically.

Setup required (before using auto-transcribe):
1) Install dependencies:
   npm install lottie-web

2) Add AssemblyAI API key to environment (server only):
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key

3) (Optional) For production you may want to store audio in object storage and point AssemblyAI to the URL instead of uploading bytes directly.

Security & cost notes:
- AssemblyAI is a paid transcription provider. You can swap the server implementation to OpenAI Whisper or another provider by editing src/pages/api/transcribe.ts. Keep your API key secret.
- Do NOT commit your AssemblyAI API key; use environment variables in your host.

How to test:
- Upload an audio file in the TimelineEditor and click "Auto-transcribe audio". The UI will send the file to /api/transcribe and populate captions when transcription completes.
- Preview and record the timeline as before.
