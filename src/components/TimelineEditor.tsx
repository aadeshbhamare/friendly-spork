import React, { useState, useRef } from 'react';
import CanvasTimelinePlayer, { Clip } from './CanvasTimelinePlayer';
import RecorderControls from './RecorderControls';

export default function TimelineEditor() {
  const [timeline, setTimeline] = useState<Clip[]>([
    { id: 'c1', type: 'lottie', duration: 3, data: { animationData: null } },
    { id: 'c2', type: 'text', duration: 4, data: { text: 'Welcome to the video', fontSize: 64 } },
  ]);
  const [captions, setCaptions] = useState<{ text: string; start: number; end: number }[]>([]);
  const [editing, setEditing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState<string>('');
  const [transcribing, setTranscribing] = useState(false);

  // new toggles for options ON/OFF
  const [opts, setOpts] = useState({
    autoTranscribe: true,
    alignLyrics: true,
    showCaptions: true,
    animateCaptions: true,
    karaoke: false,
    autoSplitLines: true,
  });

  function toggleOpt(key: keyof typeof opts) {
    setOpts((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    setCaptions([]);
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

  async function handleAlignLyrics() {
    if (!lyricsText) return alert('Paste lyrics first');
    if (!audioFile) return alert('Upload an audio file first');
    setTranscribing(true);
    try {
      const ab = await audioFile.arrayBuffer();
      const base64 = bufferToBase64(ab);
      const res = await fetch('/api/align-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, lyricsText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'align failed');
      setCaptions(json.segments || []);
    } catch (err: any) {
      alert('Align error: ' + (err?.message ?? String(err)));
    } finally {
      setTranscribing(false);
    }
  }

  function startEditing() {
    setEditing(true);
  }
  function stopEditing() {
    setEditing(false);
  }

  function updateCaption(i: number, field: 'text' | 'start' | 'end', value: any) {
    setCaptions((prev) => {
      const copy = [...prev];
      const item = { ...copy[i] };
      if (field === 'text') item.text = String(value);
      else if (field === 'start') item.start = Number(value);
      else item.end = Number(value);
      copy[i] = item;
      return copy;
    });
  }

  // demo helper
  function loadDemo() {
    const demoAudio = 'https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3';
    setAudioUrl(demoAudio);
    setAudioFile(null);
    const demoCaptions = [
      { text: 'This is the first demo line', start: 0.5, end: 3.5 },
      { text: 'Here comes the second line', start: 4.0, end: 7.0 },
      { text: 'And a short third line', start: 7.5, end: 11.0 },
    ];
    setCaptions(demoCaptions);
    setLyricsText(demoCaptions.map((c) => c.text).join('\n'));
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1 }}>
        <h3>Timeline Editor</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <button onClick={addTextClip}>Add Text Clip</button>
          <button onClick={addShapeClip}>Add Shape Clip</button>
          <label style={{ display: 'inline-block' }}>
            Upload audio
            <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'block' }} />
          </label>
          <button onClick={() => opts.autoTranscribe && handleAutoTranscribe()} disabled={transcribing || !audioFile}>
            {transcribing ? 'Transcribing...' : 'Auto-transcribe audio'}
          </button>
          <button onClick={() => opts.alignLyrics && handleAlignLyrics()} disabled={transcribing || !audioFile || !lyricsText}>
            {transcribing ? 'Aligning...' : 'Align lyrics'}
          </button>
          <button onClick={loadDemo}>Load demo (works immediately)</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ padding: 12, background: '#0d1722', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Options</h4>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.autoTranscribe} onChange={() => toggleOpt('autoTranscribe')} /> Auto-transcribe
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.alignLyrics} onChange={() => toggleOpt('alignLyrics')} /> Align lyrics (use pasted lyrics)
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.showCaptions} onChange={() => toggleOpt('showCaptions')} /> Show captions
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.animateCaptions} onChange={() => toggleOpt('animateCaptions')} /> Animate captions
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.karaoke} onChange={() => toggleOpt('karaoke')} /> Karaoke highlighting
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={opts.autoSplitLines} onChange={() => toggleOpt('autoSplitLines')} /> Auto-split lines
            </label>
          </div>
        </div>

        <div>
          <h4>Paste lyrics (one line per caption)</h4>
          <textarea value={lyricsText} onChange={(e) => setLyricsText(e.target.value)} style={{ width: '100%', height: 160 }} placeholder="Paste lyrics here, one line per display line" />
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Captions</h4>
          <div style={{ marginBottom: 8 }}>
            <button onClick={startEditing} disabled={editing} style={{ marginRight: 8 }}>Edit captions</button>
            <button onClick={stopEditing} disabled={!editing}>Done</button>
          </div>

          {editing ? (
            <div style={{ maxHeight: 300, overflow: 'auto', background: '#071024', padding: 8 }}>
              {captions.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input value={c.text} onChange={(e) => updateCaption(i, 'text', e.target.value)} style={{ flex: 1 }} />
                  <input type="number" step="0.1" value={c.start} onChange={(e) => updateCaption(i, 'start', e.target.value)} style={{ width: 80 }} />
                  <input type="number" step="0.1" value={c.end} onChange={(e) => updateCaption(i, 'end', e.target.value)} style={{ width: 80 }} />
                </div>
              ))}
            </div>
          ) : (
            <pre style={{ maxHeight: 200, overflow: 'auto', background: '#071024', color: '#fff', padding: 8 }}>
              {JSON.stringify(captions, null, 2)}
            </pre>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Recorder</h4>
          <RecorderControls canvasRef={canvasRef} audioRef={audioRef} timeline={timeline} captions={captions} />
        </div>
      </div>

      <div style={{ width: 720 }}>
        <h3>Preview</h3>
        <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, background: '#071024' }} />
        <CanvasTimelinePlayer
          canvasRef={canvasRef}
          timeline={timeline}
          captions={captions}
          audioRef={audioRef}
          showCaptions={opts.showCaptions}
          animateCaptions={opts.animateCaptions}
          karaoke={opts.karaoke}
        />
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
