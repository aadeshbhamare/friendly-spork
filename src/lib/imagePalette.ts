// src/lib/imagePalette.ts
// Utilities to extract a simple color palette from an image file (no external deps)
// and to apply a palette to a Lottie JSON by replacing color entries.

export type RGB = { r: number; g: number; b: number };

function clamp(v: number, a = 0, b = 255) {
  return Math.max(a, Math.min(b, Math.round(v)));
}

function rgbToHex({ r, g, b }: RGB) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export async function extractPaletteFromFile(file: File, maxColors = 6): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 200; // downscale to speed up
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas 2D context'));
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const counts = new Map<number, number>();
        // quantize to 5/6/5 bits to reduce unique colors
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const rq = r >> 3; // 5 bits
          const gq = g >> 2; // 6 bits
          const bq = b >> 3; // 5 bits
          const key = (rq << 11) | (gq << 5) | bq;
          counts.set(key, (counts.get(key) || 0) + 1);
        }

        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const palette: string[] = [];
        for (let i = 0; i < Math.min(maxColors, entries.length); i++) {
          const key = entries[i][0];
          const rq = (key >> 11) & 0x1f;
          const gq = (key >> 5) & 0x3f;
          const bq = key & 0x1f;
          const r = clamp((rq << 3) | (rq >> 2));
          const g = clamp((gq << 2) | (gq >> 4));
          const b = clamp((bq << 3) | (bq >> 2));
          palette.push(rgbToHex({ r, g, b }));
        }
        resolve(palette.length ? palette : ['#ffffff']);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('image load error'));
    const url = URL.createObjectURL(file);
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

function isColorArray(a: any): boolean {
  return (
    Array.isArray(a) && (a.length === 3 || a.length === 4) && a.every((v: any) => typeof v === 'number' && v >= 0 && v <= 1)
  );
}

function colorArrayToRgb(arr: number[]): RGB {
  return { r: clamp(Math.round((arr[0] ?? 0) * 255)), g: clamp(Math.round((arr[1] ?? 0) * 255)), b: clamp(Math.round((arr[2] ?? 0) * 255)) };
}

function rgbToNormalizedArray(hex: string): number[] {
  const { r, g, b } = hexToRgb(hex);
  return [r / 255, g / 255, b / 255, 1];
}

function colorDistance(a: RGB, b: RGB) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function findClosestHex(target: RGB, paletteHex: string[]) {
  let best = paletteHex[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const h of paletteHex) {
    const rgb = hexToRgb(h);
    const d = colorDistance(target, rgb);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

export function getLottieColors(animationData: any): string[] {
  const unique: string[] = [];
  function collect(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (isColorArray(v)) {
        const hex = rgbToHex(colorArrayToRgb(v));
        if (!unique.includes(hex)) unique.push(hex);
      } else if (typeof v === 'object') {
        collect(v);
      }
    }
  }
  collect(animationData);
  return unique;
}

export function applyPaletteToLottieJson(animationData: any, paletteHex: string[]) {
  const clone = JSON.parse(JSON.stringify(animationData));

  const unique: string[] = [];
  function collect(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (isColorArray(v)) {
        const hex = rgbToHex(colorArrayToRgb(v));
        if (!unique.includes(hex)) unique.push(hex);
      } else if (typeof v === 'object') {
        collect(v);
      }
    }
  }
  collect(clone);

  if (!unique.length) return clone;

  const mapping: Record<string, string> = {};
  for (const u of unique) {
    const rgb = hexToRgb(u);
    const closest = findClosestHex(rgb, paletteHex);
    mapping[u] = closest;
  }

  function replace(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (isColorArray(v)) {
        const hex = rgbToHex(colorArrayToRgb(v));
        const mapped = mapping[hex];
        if (mapped) {
          const norm = rgbToNormalizedArray(mapped);
          if (v.length === 3) obj[k] = norm.slice(0, 3);
          else obj[k] = norm.slice(0, 4);
        }
      } else if (typeof v === 'object') {
        replace(v);
      }
    }
  }
  replace(clone);
  return clone;
}
