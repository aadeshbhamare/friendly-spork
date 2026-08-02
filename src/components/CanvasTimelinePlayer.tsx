import React, { useRef, useEffect } from 'react';

export type Clip = {
  id: string;
  type: 'shape' | 'text';
  duration: number; // seconds
  data: any;
};

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  timeline: Clip[];
  captions?: { text: string; start: number; end: number }[];
  audioRef?: React.RefObject<HTMLAudioElement>;
  width?: number;
  height?: number;
};

export default function CanvasTimelinePlayer({ canvasRef, timeline, captions = [], audioRef, width = 1280, height = 720 }: Props) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime: number | null = null;
    const totalDuration = timeline.reduce((s, c) => s + c.duration, 0);

    function renderAt(tSeconds: number) {
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // background
      ctx.fillStyle = '#071024';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // determine current clip
      let cursor = 0;
      for (const clip of timeline) {
        const clipStart = cursor;
        const clipEnd = cursor + clip.duration;
        if (tSeconds >= clipStart && tSeconds < clipEnd) {
          const localT = (tSeconds - clipStart) / clip.duration;
          // render clip based on type
          if (clip.type === 'shape') {
            // simple animated circle that grows
            const { color = '#0b95f6' } = clip.data || {};
            const radius = 50 + localT * 200;
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (clip.type === 'text') {
            const { text = 'Hello', fontSize = 48 } = clip.data || {};
            const y = canvas.height / 2 + (1 - localT) * 40;
            ctx.font = `${fontSize}px Inter, Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(text, canvas.width / 2, y);
          }
          break;
        }
        cursor = clipEnd;
      }

      // draw captions
      const activeCaps = captions.filter((c) => tSeconds >= c.start && tSeconds <= c.end);
      if (activeCaps.length) {
        const cap = activeCaps[0];
        const padding = 16;
        const fontSize = 36;
        ctx.font = `${fontSize}px Inter, Arial`;
        const metrics = ctx.measureText(cap.text);
        const textWidth = metrics.width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = fontSize + padding * 2;
        const x = (canvas.width - boxWidth) / 2;
        const y = canvas.height - 120;
        // background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, x, y, boxWidth, boxHeight, 12);
        // text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(cap.text, x + padding, y + padding + fontSize * 0.7);
      }

      // small timeline indicator
      ctx.fillStyle = '#94a3b8';
      const progress = Math.min(1, Math.max(0, tSeconds / totalDuration || 0));
      ctx.fillRect(40, canvas.height - 40, (canvas.width - 80) * progress, 6);
    }

    function loop(now: number) {
      if (!startTime) startTime = now;
      const elapsedMs = now - startTime;
      const tSeconds = elapsedMs / 1000;
      const totalDurationLocal = timeline.reduce((s, c) => s + c.duration, 0);

      // if audio is present and paused, sync audio
      if (audioRef && audioRef.current) {
        const audio = audioRef.current;
        if (audio.paused && tSeconds < totalDurationLocal) {
          // ensure audio is playing when recording/previewing
        }
      }

      if (tSeconds <= totalDurationLocal) {
        renderAt(tSeconds);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        // final frame
        renderAt(totalDurationLocal);
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, timeline, captions, audioRef, width, height]);

  return null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
