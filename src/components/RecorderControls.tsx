import React, { useState } from 'react';
import type { Clip } from './CanvasTimelinePlayer';

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  timeline: Clip[];
  captions: { text: string; start: number; end: number }[];
};

export default function RecorderControls({ canvasRef, audioRef, timeline }: Props) {
  const [recording, setRecording] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFallback(blob: Blob, filename = 'recording.webm') {
    try {
      const ab = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      const res = await fetch('/api/upload-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobBase64: base64, filename }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'upload failed');
      }
      const j = await res.json();
      if (j.url) {
        setLastUrl(j.url);
        window.open(j.url, '_blank');
      }
    } catch (err: any) {
      console.error('uploadFallback failed', err);
      setError('Upload fallback failed: ' + (err?.message ?? String(err)));
    }
  }

  async function startRecording() {
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas) return setError('No canvas to record');

    const videoStream = (canvas as any).captureStream?.(60);
    if (!videoStream) return setError('captureStream not supported in this browser');

    let audioStream: MediaStream | null = null;
    try {
      audioStream = audioRef?.current?.captureStream ? audioRef.current!.captureStream() : null;
    } catch (e) {
      console.warn('audio.captureStream error', e);
      audioStream = null;
    }

    const tracks = [...videoStream.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])];
    const combined = new MediaStream(tracks);

    const preferred = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    let mimeType: string | undefined;
    for (const t of preferred) {
      if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported && (MediaRecorder as any).isTypeSupported(t)) {
        mimeType = t;
        break;
      }
    }

    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(combined, { mimeType }) : new MediaRecorder(combined);
    } catch (err: any) {
      console.error('MediaRecorder init failed', err);
      return setError('MediaRecorder not available or mimeType unsupported: ' + (err?.message ?? err));
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onerror = (ev) => {
      console.error('MediaRecorder error', ev);
      setError('Recording error: ' + String((ev as any).error?.message || ev));
    };
    recorder.onstart = () => console.log('recorder started');
    recorder.onstop = async () => {
      console.log('recorder stopped, chunks:', chunks.length);
      if (!chunks.length) {
        setError('No recorded data (chunks empty).');
        setRecording(false);
        return;
      }
      const blob = new Blob(chunks, { type: (chunks[0] instanceof Blob && (chunks[0] as Blob).type) || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setLastUrl(url);

      try {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `timeline-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); }, 1000);
      } catch (err) {
        console.warn('anchor click failed, uploading as fallback', err);
        await uploadFallback(blob);
      }

      setRecording(false);
    };

    if (audioRef.current && audioStream) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.warn('Audio play blocked; user gesture needed', err);
        setError('Browser blocked audio autoplay. Click the play button on the audio element and try recording again.');
        return;
      }
    }

    recorder.start();
    setRecording(true);

    const totalDuration = Math.max(0.5, timeline.reduce((s, c) => s + (c.duration || 0), 0));
    setTimeout(() => {
      try { if (recorder.state === 'recording') recorder.stop(); } catch (e) { console.warn('stop error', e); }
    }, (totalDuration + 0.6) * 1000);
  }

  return (
    <div>
      {error ? <div style={{ color: 'salmon', marginBottom: 8 }}>Error: {error}</div> : null}
      <button onClick={startRecording} disabled={recording} style={{ marginRight: 8 }}>
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
