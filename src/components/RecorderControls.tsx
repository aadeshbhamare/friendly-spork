import React, { useState } from 'react';

import type { Clip } from './CanvasTimelinePlayer';

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  timeline: Clip[];
  captions: { text: string; start: number; end: number }[];
};

export default function RecorderControls({ canvasRef, audioRef, timeline, captions }: Props) {
  const [recording, setRecording] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function startRecording() {
    const canvas = canvasRef.current;
    if (!canvas) return alert('No canvas to record');
    const videoStream = (canvas as any).captureStream?.(60);
    if (!videoStream) return alert('captureStream not supported in this browser');

    const audioStream = audioRef?.current?.captureStream?.();
    const combined = new MediaStream([...videoStream.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])]);

    const mimeType = 'video/webm;codecs=vp9,opus';
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, { mimeType });
    } catch (e) {
      recorder = new MediaRecorder(combined);
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setLastUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-${Date.now()}.webm`;
      a.click();
      setRecording(false);
      if (audioRef.current) audioRef.current.pause();
    };

    // start playing audio and start recorder
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.warn('audio play failed', err);
      }
    }

    recorder.start();
    setRecording(true);

    // compute total duration
    const totalDuration = timeline.reduce((s, c) => s + c.duration, 0);
    // stop after duration
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, (totalDuration + 0.5) * 1000);
  }

  return (
    <div>
      <button onClick={startRecording} disabled={recording}>
        {recording ? 'Recording...' : 'Record timeline'}
      </button>
      {lastUrl && (
        <a href={lastUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}>
          Preview last
        </a>
      )}
    </div>
  );
}
