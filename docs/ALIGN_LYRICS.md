# Lyrics alignment: Align lyrics text to ASR transcript timestamps

This feature adds a server endpoint and client UI to align user-provided lyrics (text) to a word-level ASR transcript and produce time-stamped caption segments suitable for on-screen animated captions.

Files added in branch fix/align-lyrics:
- src/lib/align.ts — alignment implementation (fuzzy match + heuristics)
- src/pages/api/align-lyrics.ts — Next.js API route; uses AssemblyAI to get word timestamps if audio is provided
- src/components/TimelineEditor.tsx — wired UI: lyrics textarea, Align Lyrics button, and "Edit captions" overlay

How to test locally
1. Ensure AssemblyAI API key is set in your local environment: ASSEMBLYAI_API_KEY=your_key
2. Checkout the branch:
   git fetch && git checkout fix/align-lyrics
3. Install deps:
   npm install lottie-web
4. Start dev server:
   npm run dev
5. Open the page that renders TimelineEditor (add a route if not present). Paste or upload a small audio file (clear speech/music), paste lyrics into the lyrics textarea (one display line per lyric line), then click "Align lyrics".
6. After alignment completes, captions will populate. Click "Edit captions" to fine-tune timings or text, then use "Record timeline" to export a WebM with captions burned-in.

Notes & limitations
- Alignment quality depends on the ASR accuracy (noisy music may yield poorer alignment). Provide clean audio for best results.
- The algorithm is forgiving (fuzzy edit distance match), but repeated choruses or many ad-libs may need manual correction in the Edit captions UI.
- For production, consider offering a forced-aligner or phoneme-based aligner for higher precision (more complex to run server-side).

If you want, I can now:
- Add a small captions editing UX with waveform scrubber for precise timing adjustments.
- Implement server-side MP4 creation so final exports are H.264 MP4 files.
- Add example lyrics + sample audio files for testing.
