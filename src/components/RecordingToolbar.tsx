import React, { useState } from "react";
import { recordCanvasStreamToWebM } from "../utils/recordCanvas";

type Props = {
  // Pass a ref to the canvas element you want to record
  canvasRef: React.RefObject<HTMLCanvasElement>;
  seconds?: number;
};

export default function RecordingToolbar({ canvasRef, seconds = 5 }: Props) {
  const [recording, setRecording] = useState(false);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);

  async function startRecording() {
    if (!canvasRef.current) return alert("No canvas found to record");
    setRecording(true);
    try {
      const blob = await recordCanvasStreamToWebM(canvasRef.current, seconds);
      const url = URL.createObjectURL(blob);
      setLastBlobUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `animation-recording-${Date.now()}.webm`;
      a.click();
    } catch (err) {
      console.error("Recording failed", err);
      alert("Recording failed: " + (err as Error).message);
    } finally {
      setRecording(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={startRecording} disabled={recording} aria-pressed={recording}>
        {recording ? "Recording..." : `Record ${seconds}s`}
      </button>
      {lastBlobUrl ? (
        <a href={lastBlobUrl} target="_blank" rel="noopener noreferrer">
          Preview
        </a>
      ) : null}
    </div>
  );
}
