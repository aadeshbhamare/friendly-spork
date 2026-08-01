# Animations & Recording - Integration Guide

This doc adds a small demo integration for higher-quality animations and an in-browser recording utility.

What was added in branch `enhance/animations-recording`:

- `src/components/AnimatedChatMessage.tsx` — React component using GSAP for entrance animation and Lottie for optional avatar/icon.
- `src/components/RecordingToolbar.tsx` — small toolbar component that records a provided canvas to WebM and triggers a download.
- `src/utils/recordCanvas.ts` — utility that uses `HTMLCanvasElement.captureStream()` + `MediaRecorder` to produce a WebM Blob.

Install recommended dependencies (example with npm):

```bash
# Install runtime deps used by the added components
npm install gsap @lottiefiles/react-lottie-player

# Optional for client-side transcoding (heavy):
# npm install @ffmpeg/ffmpeg
```

How to use AnimatedChatMessage

```tsx
import AnimatedChatMessage from "src/components/AnimatedChatMessage";
import botLottie from "../assets/bot-icon.json"; // example

function Chat() {
  return (
    <div>
      <AnimatedChatMessage author="bot" lottieJson={botLottie}>
        Hello from the bot with a nice animation!
      </AnimatedChatMessage>
    </div>
  );
}
```

How to record a canvas

Render your animation to an HTMLCanvasElement (preferred for best recording quality). Pass a ref of that canvas into `RecordingToolbar`.

```tsx
import React, { useRef } from "react";
import RecordingToolbar from "src/components/RecordingToolbar";

function AnimationPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div>
      <canvas ref={canvasRef} width={1280} height={720} />
      <RecordingToolbar canvasRef={canvasRef} seconds={6} />
    </div>
  );
}
```

Notes & recommendations

- For HD output, render the canvas at the target resolution (e.g., 1920x1080) and scale your animation accordingly.
- Use Lottie for vector animations that scale cleanly and look HD at any resolution.
- `@ffmpeg/ffmpeg` can transcode WebM -> MP4 client-side but is CPU and memory heavy; consider server-side transcoding for production.
- Respect `prefers-reduced-motion` for accessibility. Provide toggles for users who need reduced motion.

Next steps I can implement on this branch or follow-up branches:
- Add a small demo page in the app that shows the AnimatedChatMessage + live Lottie + recording flow.
- Update package.json automatically to include dependencies and run a CI test.
- Add an example Lottie JSON asset and wire it into the demo.

If you want me to proceed to update package.json, add a demo page, and open a PR with these changes merged into your default branch, tell me and I will proceed.
