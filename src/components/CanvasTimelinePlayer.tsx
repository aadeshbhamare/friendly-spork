import React, { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

export type Clip = {
  id: string;
  type: 'shape' | 'text' | 'lottie';
  duration: number; // seconds
  data: any;
};

type Caption = { text: string; start: number; end: number };

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  timeline: Clip[];
  captions?: Caption[];
  audioRef?: React.RefObject<HTMLAudioElement>;
  width?: number;
  height?: number;
  // new options
  showCaptions?: boolean;
  animateCaptions?: boolean;
  karaoke?: boolean;
};

// Map clip id => Lottie animation instance & its canvas element
const lottieInstances = new Map<string, { anim: AnimationItem; canvas: HTMLCanvasElement }>();

export default function CanvasTimelinePlayer({
  canvasRef,
  timeline,
  captions = [],
  audioRef,
  width = 1280,
  height = 720,
  showCaptions = true,
  animateCaptions = true,
  karaoke = false,
}: Props) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup lottie instances for any lottie clips
    timeline.forEach((clip) => {
      if (clip.type === 'lottie' && clip.data && clip.data.animationData) {
        if (!lottieInstances.has(clip.id)) {
          const container = document.createElement('div');
          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          document.body.appendChild(container);

          const anim = lottie.loadAnimation({
            container,
            renderer: 'canvas',
            loop: false,
            autoplay: false,
            animationData: clip.data.animationData,
          });

          const waitForCanvas = () => {
            const createdCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;
            if (createdCanvas) {
              createdCanvas.width = width;
              createdCanvas.height = height;
              lottieInstances.set(clip.id, { anim, canvas: createdCanvas });
            } else {
              setTimeout(waitForCanvas, 50);
            }
          };
          waitForCanvas();
        }
      }
    });

    let startTime: number | null = null;
    const totalDuration = timeline.reduce((s, c) => s + c.duration, 0);

    function drawKaraokeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, progress: number) {
      // draw base text
      ctx.save();
      ctx.font = '36px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#aaa';
      ctx.fillText(text, x, y);
      // measure and draw overlay clipped to progress
      const metrics = ctx.measureText(text);
      const w = metrics.width;
      const clipW = w * Math.max(0, Math.min(1, progress));
      ctx.beginPath();
      ctx.rect(x - w / 2, y - 36, clipW, 48);
      ctx.clip();
      ctx.fillStyle = '#0b95f6';
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function renderAt(tSeconds: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#071024';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let cursor = 0;
      for (const clip of timeline) {
        const clipStart = cursor;
        const clipEnd = cursor + clip.duration;
        if (tSeconds >= clipStart && tSeconds < clipEnd) {
          const localT = (tSeconds - clipStart) / clip.duration;
          if (clip.type === 'shape') {
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
          } else if (clip.type === 'lottie') {
            const inst = lottieInstances.get(clip.id);
            if (inst) {
              try {
                const anim = inst.anim;
                const durationFrames = anim.getDuration(true);
                const frame = Math.floor(localT * durationFrames);
                anim.goToAndStop(frame, true);
                ctx.drawImage(inst.canvas, 0, 0, canvas.width, canvas.height);
              } catch (e) {}
            } else {
              ctx.fillStyle = '#0b95f6';
              ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2 - 40, 160, 80);
              ctx.fillStyle = '#fff';
              ctx.textAlign = 'center';
              ctx.fillText('Loading animation...', canvas.width / 2, canvas.height / 2);
            }
          }
          break;
        }
        cursor = clipEnd;
      }

      if (showCaptions && captions.length) {
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
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          roundRect(ctx, x, y, boxWidth, boxHeight, 12);

          const centerX = canvas.width / 2;
          const centerY = y + padding + fontSize * 0.7;

          if (karaoke) {
            const progress = (tSeconds - cap.start) / Math.max(0.001, cap.end - cap.start);
            drawKaraokeText(ctx, cap.text, centerX, centerY, progress);
          } else if (animateCaptions) {
            const mid = (cap.start + cap.end) / 2;
            const dur = cap.end - cap.start;
            const p = Math.max(0, Math.min(1, (tSeconds - cap.start) / Math.max(0.001, dur)));
            ctx.save();
            ctx.globalAlpha = p < 0.2 ? p * 5 : 1; // simple fade-in
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(cap.text, centerX, centerY);
            ctx.restore();
          } else {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(cap.text, centerX, centerY);
          }
        }
      }

      ctx.fillStyle = '#94a3b8';
      const progress = Math.min(1, Math.max(0, tSeconds / totalDuration || 0));
      ctx.fillRect(40, canvas.height - 40, (canvas.width - 80) * progress, 6);
    }

    function loop(now: number) {
      if (!startTime) startTime = now;
      const elapsedMs = now - startTime;
      const tSeconds = elapsedMs / 1000;
      const totalDurationLocal = timeline.reduce((s, c) => s + c.duration, 0);

      if (tSeconds <= totalDurationLocal) {
        if (audioRef && audioRef.current) {
          const audio = audioRef.current;
          if (!audio.paused && Math.abs(audio.currentTime - tSeconds) > 0.3) {
            try { audio.currentTime = tSeconds; } catch (e) {}
          }
        }

        renderAt(tSeconds);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        renderAt(totalDurationLocal);
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timeline.forEach((clip) => {
        if (clip.type === 'lottie') {
          const inst = lottieInstances.get(clip.id);
          if (inst) {
            try { inst.anim.destroy(); } catch (e) {}
            const parent = inst.canvas.parentElement;
            if (parent && parent.parentElement) parent.parentElement.removeChild(parent);
            lottieInstances.delete(clip.id);
          }
        }
      });
    };
  }, [canvasRef, timeline, captions, audioRef, width, height, showCaptions, animateCaptions, karaoke]);

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
