import React, { useState, useRef } from 'react';
import CanvasTimelinePlayer, { Clip } from './CanvasTimelinePlayer';
import RecorderControls from './RecorderControls';

export default function TimelineEditor() {
  const [timeline, setTimeline] = useState<Clip[]>([
    { id: 'c1', type: 'shape', duration: 3, data: { color: '#0b95f6' } },
    { id: 'c2', type: 'text', duration: 4, data: { text: 'Welcome to the video', fontSize: 64 } },
    { id: 'c3', type: 'shape', duration: 2, data: { color: '#0fbc7d' } },
  ]);
  const [captions, setCaptions] = useState<{ text: string; start: number; end: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  function addTextClip() {
    const id = 'c' + (timeline.length + 1);
    setTimeline([...timeline, { id, type: 'text', duration: 3, data: { text: 'New text', fontSize: 48 } }]);
  }

  function addShapeClip() {
    const id = 'c' + (timeline.length + 1);
    setTimeline([...timeline, { id, type: 'shape', duration: 2, data: { color: '#eab308' } }]);
  }

  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setCaptions([]); // clear captions until user provides
  }

  function handlePasteSRT(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const srt = e.target.value;
    const parsed = parseSRT(srt);
    setCaptions(parsed);
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
          <h4>Captions (paste SRT)</h4>
          <textarea placeholder="Paste SRT here" onChange={handlePasteSRT} style={{ width: '100%', height: 160 }} />
          <div style={{ marginTop: 8 }}>
            Parsed captions: {captions.length}
          </div>
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

function parseSRT(srt: string) {
  // very small SRT parser: returns [{text, start, end}]
  const parts = srt.split('\n\n');
  const out: { text: string; start: number; end: number }[] = [];
  for (const part of parts) {
    const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const timeLine = lines[1];
      const m = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!m) continue;
      const start = parseTime(m[1]);
      const end = parseTime(m[2]);
      const text = lines.slice(2).join('\n');
      out.push({ text, start, end });
    }
  }
  return out;
}

function parseTime(ts: string) {
  // format: 00:00:01,234
  const [h, m, rest] = ts.split(':');
  const [s, ms] = rest.split(',');
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}
