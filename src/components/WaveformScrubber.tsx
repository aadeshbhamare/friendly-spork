import React, { useEffect, useRef, useState } from 'react';

type Props = {
  audioFile?: File | null;
  audioUrl?: string | null;
  onSeek?: (t: number) => void;
  selection?: { start: number; end: number } | null;
  onSelectionChange?: (sel: { start: number; end: number } | null) => void;
};

export default function WaveformScrubber({ audioFile, audioUrl, onSeek, selection, onSelectionChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function decode() {
      try {
        let ab: ArrayBuffer | null = null;
        if (audioFile) {
          ab = await audioFile.arrayBuffer();
        } else if (audioUrl) {
          const res = await fetch(audioUrl);
          ab = await res.arrayBuffer();
        }
        if (!ab) return;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(ab.slice(0));
        if (cancelled) return;
        const ch = decoded.getChannelData(0);
        const step = Math.max(1, Math.floor(ch.length / 1024));
        const p: number[] = [];
        for (let i = 0; i < ch.length; i += step) {
          let max = 0;
          for (let j = 0; j < step && i + j < ch.length; j++) {
            const v = Math.abs(ch[i + j]);
            if (v > max) max = v;
          }
          p.push(max);
        }
        setDuration(decoded.duration || 0);
        setPeaks(p);
        ctx.close();
      } catch (err) {
        console.warn('waveform decode failed', err);
      }
    }
    decode();
    return () => { cancelled = true; };
  }, [audioFile, audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    if (!peaks) return;
    ctx.fillStyle = '#0b2b3a';
    ctx.fillRect(0, 0, w, h);
    const barW = w / peaks.length;
    ctx.fillStyle = '#6ee7b7';
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const ph = peaks[i] * h;
      ctx.fillRect(x, (h - ph) / 2, Math.max(1, barW - 1), ph);
    }
    // draw selection if present
    if (selection && duration > 0) {
      ctx.fillStyle = 'rgba(11,149,246,0.25)';
      const sx = (selection.start / duration) * w;
      const ex = (selection.end / duration) * w;
      ctx.fillRect(sx, 0, Math.max(2, ex - sx), h);
      ctx.strokeStyle = 'rgba(11,149,246,0.6)';
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.strokeRect(sx, 0, Math.max(2, ex - sx), h);
    }
  }, [peaks, selection, duration]);

  // click to seek or drag to select range
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let startX = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startX = (e.offsetX * devicePixelRatio);
      if (onSeek && !selection) {
        // immediate seek
        const t = duration ? (startX / canvas.width) * duration : 0;
        onSeek(t);
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const x = e.offsetX * devicePixelRatio;
      const s = Math.min(startX, x) / canvas.width * duration;
      const eT = Math.max(startX, x) / canvas.width * duration;
      onSelectionChange && onSelectionChange({ start: Math.max(0, s), end: Math.max(0, eT) });
    };
    const onUp = (e: MouseEvent) => {
      if (!dragging) return;
      dragging = false;
    };
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [duration, onSeek, onSelectionChange, selection]);

  return (
    <div style={{ width: '100%', height: 80, background: '#071024', borderRadius: 8, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
