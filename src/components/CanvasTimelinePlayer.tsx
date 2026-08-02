import React, { useRef, useEffect } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

export type Clip = {
  id: string;
  type: 'shape' | 'text' | 'lottie';
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

// Map clip id => Lottie animation instance & its canvas element
const lottieInstances = new Map<string, { anim: AnimationItem; canvas: HTMLCanvasElement }>();

export default function CanvasTimelinePlayer({ canvasRef, timeline, captions = [], audioRef, width = 1280, height = 720 }: Props) {
  const rafRef = React.useRef<number | null>(null);

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
          // create an offscreen canvas container
          const offscreen = document.createElement('canvas');
          offscreen.width = width;
          offscreen.height = height;
          // lottie expects a container element; it will create its own canvas inside that container for renderer:'canvas'
          const container = document.createElement('div');
          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          document.body.appendChild(container);

          // Create the animation with canvas renderer
          const anim = lottie.loadAnimation({
            container,
            renderer: 'canvas',
            loop: false,
            autoplay: false,
            animationData: clip.data.animationData,
          });

          // Wait for lottie to create its canvas element
          const waitForCanvas = () => {
            const createdCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;
            if (createdCanvas) {
              // scale canvases if needed
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
            // progress Lottie animation to correct frame/time
            const inst = lottieInstances.get(clip.id);
            if (inst) {
              try {
                const anim = inst.anim;
                const durationFrames = anim.getDuration(true); // frames
                const frame = Math.floor(localT * durationFrames);
                anim.goToAndStop(frame, true);
                // draw the lottie's own canvas onto the main canvas
                ctx.drawImage(inst.canvas, 0, 0, canvas.width, canvas.height);
              } catch (e) {
                // fallback: nothing
              }
            } else {
              // Lottie not yet initialized — draw placeholder
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

      if (tSeconds <= totalDurationLocal) {
        // sync audio playback roughly
        if (audioRef && audioRef.current) {
          const audio = audioRef.current;
          if (!audio.paused && Math.abs(audio.currentTime - tSeconds) > 0.3) {
            // keep them roughly in sync
            try { audio.currentTime = tSeconds; } catch (e) {}
          }
        }

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
      // clean up lottie instances for this timeline (we leave others intact if reused)
      timeline.forEach((clip) => {
        if (clip.type === 'lottie') {
          const inst = lottieInstances.get(clip.id);
          if (inst) {
            try { inst.anim.destroy(); } catch (e) {}
            // remove the container canvas's parent if exists
            const parent = inst.canvas.parentElement;
            if (parent && parent.parentElement) parent.parentElement.removeChild(parent);
            lottieInstances.delete(clip.id);
          }
        }
      });
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
