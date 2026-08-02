import React, { useState, useRef } from 'react';
import CanvasTimelinePlayer, { Clip } from './CanvasTimelinePlayer';
import RecorderControls from './RecorderControls';

export default function TimelineEditor() {
  const [timeline, setTimeline] = useState<Clip[]>([
    { id: 'c1', type: 'lottie', duration: 3, data: { animationData: null } },
    { id: 'c2', type: 'text', duration: 4, data: { text: 'Welcome to the video', fontSize: 64 } },
  ]);
  const [captions, setCaptions] = useState<{ text: string; start: number; end: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  function addTextClip() {
    const id = 'c' + (timeline.length + 1);
    setTimeline([...timeline, { id, type: 'text', duration: 3, data: { text: 'New text', fontSize: 48 } }]);
  }

  function addLottieClip(animationData: any, duration = 3) {
    const id = 'c' + (timeline.length + 1);
    setTimeline([...timeline, { id, type: 'lottie', duration, data: { animationData } }]);
  }

  function addShapeClip() {
    const id = 'c' + (timeline.length + 1);
    setTimeline([...timeline, { id, type: 'shape', duration: 2, data: { color: '#eab308' } }]);
  }

  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setCaptions([]); // clear captions until user provides
  }

  async function handleAutoTranscribe() {
    if (!audioFile) return alert('Upload an audio file first');
    setTranscribing(true);
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64 = bufferToBase64(arrayBuffer);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, filename: audioFile.name }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Transcription failed');
      }
      const json = await res.json();
      // expected: { segments: [{ text, start, end }] }
      if (json.segments) {
        setCaptions(json.segments);
      } else {
        alert('No segments returned from transcription');
      }
    } catch (err: any) {
      alert('Transcription error: ' + (err?.message ?? String(err)));
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1 }}>
        <h3>Timeline Editor</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={addTextClip}>Add Text Clip</button>
          <button onClick={addShapeClip}>Add Shape Clip</button>
          <label style={{ display: 'inline-block' }}>
            Upload audio
            <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'block' }} />
          </label>
          <button onClick={handleAutoTranscribe} disabled={transcribing || !audioFile}>
            {transcribing ? 'Transcribing...' : 'Auto-transcribe audio'}
          </button>
        </div>

        <div>
          <h4>Clips</h4>
          <ol>
            {timeline.map((c, i) => (
              <li key={c.id}>
                {c.type} — {c.duration}s — {JSON.stringify(c.data)}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Captions</h4>
          <pre style={{ maxHeight: 200, overflow: 'auto', background: '#071024', color: '#fff', padding: 8 }}>
            {JSON.stringify(captions, null, 2)}
          </pre>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Recorder</h4>
          <RecorderControls canvasRef={canvasRef} audioRef={audioRef} timeline={timeline} captions={captions} />
        </div>
      </div>

      <div style={{ width: 720 }}>
        <h3>Preview</h3>
        <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, background: '#071024' }} />
        <CanvasTimelinePlayer canvasRef={canvasRef} timeline={timeline} captions={captions} audioRef={audioRef} />
        <audio ref={audioRef} src={audioUrl ?? undefined} controls style={{ marginTop: 8, width: '100%' }} />
      </div>
    </div>
  );
}

function bufferToBase64(ab: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(ab);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
