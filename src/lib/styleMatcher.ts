// src/lib/styleMatcher.ts
import { extractPaletteFromFile } from './imagePalette';

export type ImageFeatures = {
  palette: string[];
  brightness: number; // 0..1
  saturation: number; // 0..1
  edgeDensity: number; // 0..1
};

export type Style = {
  id: string;
  name: string;
  description: string;
  thumbnail?: string; // url or data-uri for preview
  tags?: string[];
  preferred?: {
    minSaturation?: number;
    maxSaturation?: number;
    minBrightness?: number;
    maxBrightness?: number;
    maxEdgeDensity?: number;
  };
};

import stylesLib from '../data/styleLibrary.json';

const STYLE_LIBRARY: Style[] = (stylesLib as any) as Style[];

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

async function computeEdgeDensityFromImage(file: File, downsample = 200): Promise<number> {
  // Draw to canvas, compute simple gradient magnitude and measure fraction above threshold
  return new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > h) {
        if (w > downsample) { h = Math.round((h * downsample) / w); w = downsample; }
      } else {
        if (h > downsample) { w = Math.round((w * downsample) / h); h = downsample; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(0);
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      // compute simple gradient (Sobel-ish) per pixel using neighbors
      const gray = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          gray[y * w + x] = lum;
        }
      }
      let count = 0;
      let total = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx = (gray[i + 1] - gray[i - 1]) * 0.5;
          const gy = (gray[i + w] - gray[i - w]) * 0.5;
          const mag = Math.sqrt(gx * gx + gy * gy);
          if (mag > 20) count++;
          total++;
        }
      }
      const density = total ? count / total : 0;
      resolve(clamp01(density));
    };
    img.onerror = () => resolve(0);
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(file);
  });
}

export async function extractImageFeatures(file: File): Promise<ImageFeatures> {
  const palette = await extractPaletteFromFile(file, 6);
  // estimate brightness & saturation from palette average
  let brightness = 0;
  let saturation = 0;
  for (const hex of palette) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    brightness += (max + min) / 2;
    const sat = max === 0 ? 0 : (max - min) / max;
    saturation += sat;
  }
  brightness = clamp01(brightness / Math.max(1, palette.length));
  saturation = clamp01(saturation / Math.max(1, palette.length));
  const edgeDensity = await computeEdgeDensityFromImage(file);
  return { palette, brightness, saturation, edgeDensity };
}

function scoreStyleForFeatures(style: Style, f: ImageFeatures) {
  // Base score from matching rules defined in style.preferred
  let score = 0;
  // prefer saturation
  if (style.preferred?.minSaturation !== undefined) {
    const diff = Math.max(0, style.preferred.minSaturation - f.saturation);
    score -= diff * 2;
  }
  if (style.preferred?.maxSaturation !== undefined) {
    const diff = Math.max(0, f.saturation - style.preferred.maxSaturation);
    score -= diff * 2;
  }
  if (style.preferred?.minBrightness !== undefined) {
    const diff = Math.max(0, style.preferred.minBrightness - f.brightness);
    score -= diff * 1.5;
  }
  if (style.preferred?.maxBrightness !== undefined) {
    const diff = Math.max(0, f.brightness - style.preferred.maxBrightness);
    score -= diff * 1.5;
  }
  if (style.preferred?.maxEdgeDensity !== undefined) {
    const diff = Math.max(0, f.edgeDensity - style.preferred.maxEdgeDensity);
    score -= diff * 2;
  }
  // bonus based on tags: saturated -> particle, low-sat -> cinematic/soft
  if (f.saturation > 0.55 && style.tags?.includes('energetic')) score += 1.2;
  if (f.saturation < 0.3 && style.tags?.includes('soft')) score += 1.0;
  if (f.edgeDensity > 0.12 && style.tags?.includes('subtle')) score += 0.6;
  if (f.edgeDensity > 0.12 && style.tags?.includes('particles')) score += 0.8;

  // small random tie-breaker
  score += Math.random() * 0.01;
  return score;
}

export async function suggestStylesForImage(file: File, topK = 3) {
  const features = await extractImageFeatures(file);
  const scored = STYLE_LIBRARY.map((s) => ({ style: s, score: scoreStyleForFeatures(s, features) }));
  scored.sort((a, b) => b.score - a.score);
  return { features, suggestions: scored.slice(0, topK).map((s) => s.style) };
}
