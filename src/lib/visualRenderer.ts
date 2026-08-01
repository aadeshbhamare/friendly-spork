import type { AudioAnalysis, StyleConfig, TextOverlay, ImageLayer, CharacterMessageConfig, CharacterType, CharacterEmotion } from '@/types';
import { getPresetById } from './visualPresets';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; hue: number; alpha: number;
}

/**
 * Canvas-based real-time visual renderer.
 * Draws cinematic animated scenes synced to audio analysis data.
 * Supports 25+ visual presets with particles, effects, camera movement, and beat reactivity.
 */
export class VisualRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];
  private time = 0;
  private rafId = 0;
  private analysis: AudioAnalysis | null = null;
  private config: StyleConfig = {};
  private presetId = 'auto';
  private audioEl: HTMLAudioElement | null = null;
  private beatPulse = 0;
  private lastBeatTime = -1;
  private cameraOffset = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private stars: { x: number; y: number; z: number; size: number }[] = [];
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.initStars();
  }

  private initStars() {
    this.stars = Array.from({ length: 300 }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 1000 + 100,
      size: Math.random() * 2 + 0.5,
    }));
  }

  setAudioAnalysis(a: AudioAnalysis) { this.analysis = a; }
  setStyleConfig(c: StyleConfig) { this.config = { ...this.config, ...c }; }
  setPreset(id: string) {
    this.presetId = id;
    const preset = getPresetById(id);
    if (preset && id !== 'auto') {
      this.config = { ...preset.defaultConfig, ...this.config };
    }
  }
  attachAudio(el: HTMLAudioElement) { this.audioEl = el; }

  setTextOverlays(overlays: TextOverlay[]) { this.config = { ...this.config, textOverlays: overlays }; }
  setImageLayers(layers: ImageLayer[]) { this.config = { ...this.config, imageLayers: layers }; }
  setCharacterMessages(msgs: CharacterMessageConfig[]) { this.config = { ...this.config, characterMessages: msgs }; }

  private getImage(url: string): HTMLImageElement | null {
    if (this.imageCache.has(url)) return this.imageCache.get(url)!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    this.imageCache.set(url, img);
    return img;
  }

  start() {
    if (this.rafId) return;
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  destroy() {
    this.stop();
    this.particles = [];
  }

  private getCurrentTime(): number {
    return this.audioEl?.currentTime ?? this.time;
  }

  private getBeatIntensity(): number {
    if (!this.analysis) return 0;
    const t = this.getCurrentTime();
    // Find nearest beat
    for (const beat of this.analysis.beatPositions) {
      const dt = t - beat;
      if (dt >= 0 && dt < 0.15) {
        return 1 - dt / 0.15;
      }
    }
    return 0;
  }

  private getSectionEnergy(): number {
    if (!this.analysis) return 0.5;
    const t = this.getCurrentTime();
    const section = this.analysis.sections.find((s) => t >= s.start && t < s.end);
    return section?.energy ?? this.analysis.energy;
  }

  private render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    this.time += 0.016;

    const beat = this.getBeatIntensity();
    if (beat > 0.5 && this.time - this.lastBeatTime > 0.1) {
      this.beatPulse = 1;
      this.lastBeatTime = this.time;
    }
    this.beatPulse *= 0.92;

    // Determine effective preset
    let presetId = this.presetId;
    if (presetId === 'auto' && this.analysis) {
      presetId = this.autoSelectPreset();
    }

    // Background fill based on palette
    const palette = this.config.colorPalette ?? this.getPaletteForPreset(presetId);
    this.drawBackground(w, h, palette, beat);

    // Camera transform
    this.updateCamera(beat);
    ctx.save();
    ctx.translate(w / 2 + this.cameraOffset.x, h / 2 + this.cameraOffset.y);
    ctx.scale(this.cameraOffset.zoom, this.cameraOffset.zoom);
    ctx.rotate(this.cameraOffset.rotation);

    // Render the preset scene
    this.renderPreset(presetId, w, h, beat);

    ctx.restore();

    // Image layers (uploaded images composited into scene)
    this.drawImageLayers(w, h, beat);

    // Text overlays (kinetic typography from uploaded documents/text)
    this.drawTextOverlays(w, h, beat);

    // Character messages (in-world character speaking)
    this.drawCharacterMessages(w, h, beat);

    // Post-processing overlays (glow, vignette, grain)
    this.drawPostFX(w, h, beat);
  }

  private autoSelectPreset(): string {
    if (!this.analysis) return 'galaxy_flow';
    const { bpm, energy, bass, mood } = this.analysis;
    if (mood === 'Aggressive' || (bass > 0.7 && energy > 0.7)) return 'fire_pulse';
    if (mood === 'Relaxed' || energy < 0.3) return 'dreamscape';
    if (bpm > 140) return 'neon_tunnel';
    if (bpm > 120) return 'galaxy_flow';
    if (bpm > 100) return 'aurora_flow';
    return 'particle_drift';
  }

  private getPaletteForPreset(presetId: string): string[] {
    const preset = getPresetById(presetId);
    return preset?.defaultConfig.colorPalette ?? ['#3b82f6', '#06b6d4', '#1a1a3e'];
  }

  private drawBackground(w: number, h: number, palette: string[], beat: number) {
    const { ctx } = this;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    const baseColor = palette[palette.length - 1] ?? '#0a0a1a';
    const midColor = palette[0] ?? '#3b82f6';
    grad.addColorStop(0, this.mixColor(baseColor, midColor, 0.3 + beat * 0.2));
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private renderPreset(presetId: string, w: number, h: number, beat: number) {
    switch (presetId) {
      case 'galaxy_flow': this.renderGalaxy(w, h, beat); break;
      case 'neon_tunnel': this.renderNeonTunnel(w, h, beat); break;
      case 'particle_drift': this.renderParticleDrift(w, h, beat); break;
      case 'dark_vortex': this.renderDarkVortex(w, h, beat); break;
      case 'kaleidoscope': this.renderKaleidoscope(w, h, beat); break;
      case 'spectrum_wave': this.renderSpectrumWave(w, h, beat); break;
      case 'pulse_grid': this.renderPulseGrid(w, h, beat); break;
      case 'aurora_flow': this.renderAurora(w, h, beat); break;
      case 'fire_pulse': this.renderFire(w, h, beat); break;
      case 'smoke_flow': this.renderSmoke(w, h, beat); break;
      case 'golden_aura': this.renderGoldenAura(w, h, beat); break;
      case 'dreamscape': this.renderDreamscape(w, h, beat); break;
      case 'cyber_grid': this.renderCyberpunk(w, h, beat); break;
      case 'synthwave': this.renderSynthwave(w, h, beat); break;
      case 'water_world': this.renderWater(w, h, beat); break;
      case 'forest_realm': this.renderForest(w, h, beat); break;
      case 'temple_divine': this.renderTemple(w, h, beat); break;
      case 'anime_world': this.renderAnime(w, h, beat); break;
      case 'epic_cinematic': this.renderEpic(w, h, beat); break;
      case 'minimal_clean': this.renderMinimal(w, h, beat); break;
      case 'luxury_gold': this.renderLuxury(w, h, beat); break;
      case 'retro_vhs': this.renderRetroVHS(w, h, beat); break;
      case 'fractal_flow': this.renderFractal(w, h, beat); break;
      case 'liquid_flow': this.renderLiquid(w, h, beat); break;
      default: this.renderGalaxy(w, h, beat);
    }
  }

  // --- Galaxy ---
  private renderGalaxy(w: number, h: number, beat: number) {
    const { ctx } = this;
    const energy = this.getSectionEnergy();
    // Stars
    for (const star of this.stars) {
      star.z -= 2 + beat * 10 + energy * 3;
      if (star.z < 1) {
        star.x = (Math.random() - 0.5) * 2000;
        star.y = (Math.random() - 0.5) * 2000;
        star.z = 1000;
      }
      const sx = (star.x / star.z) * 300;
      const sy = (star.y / star.z) * 300;
      const size = (1 - star.z / 1000) * star.size * 3;
      const alpha = (1 - star.z / 1000) * 0.9;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.1, size), 0, Math.PI * 2);
      ctx.fill();
    }
    // Nebula clouds
    const palette = this.getPaletteForPreset('galaxy_flow');
    for (let i = 0; i < 3; i++) {
      const angle = this.time * 0.1 + i * 2.1;
      const r = 200 + Math.sin(this.time * 0.3 + i) * 50;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.6;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 300 + beat * 100);
      grad.addColorStop(0, this.hexToRgba(palette[i % palette.length], 0.15 + beat * 0.1));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 300 + beat * 100, 0, Math.PI * 2);
      ctx.fill();
    }
    this.spawnParticles(2 + Math.floor(beat * 5), w, h, 'galaxy');
    this.updateAndDrawParticles();
  }

  // --- Neon Tunnel ---
  private renderNeonTunnel(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('neon_tunnel');
    const rings = 20;
    for (let i = 0; i < rings; i++) {
      const z = ((i / rings) + this.time * 0.5) % 1;
      const r = z * 600 + 20;
      const alpha = (1 - z) * 0.6;
      const color = palette[i % palette.length];
      ctx.strokeStyle = this.hexToRgba(color, alpha);
      ctx.lineWidth = 2 + beat * 4;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Center glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 + beat * 50);
    grad.addColorStop(0, this.hexToRgba(palette[0], 0.5 + beat * 0.3));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(-200, -200, 400, 400);
  }

  // --- Particle Drift ---
  private renderParticleDrift(w: number, h: number, beat: number) {
    this.spawnParticles(3 + Math.floor(beat * 4), w, h, 'drift');
    this.updateAndDrawParticles();
  }

  // --- Dark Vortex ---
  private renderDarkVortex(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('dark_vortex');
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + this.time * 0.5;
      const r = 50 + i * 5 + Math.sin(this.time + i * 0.1) * 30 + beat * 50;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const size = 2 + Math.sin(i * 0.5) * 2 + beat * 3;
      ctx.fillStyle = this.hexToRgba(palette[i % palette.length], 0.4 + beat * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Kaleidoscope ---
  private renderKaleidoscope(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('kaleidoscope');
    const segments = 8;
    for (let s = 0; s < segments; s++) {
      ctx.save();
      ctx.rotate((s / segments) * Math.PI * 2);
      for (let i = 0; i < 5; i++) {
        const r = 50 + i * 60 + beat * 30 + Math.sin(this.time + i) * 20;
        const x = Math.cos(this.time * 0.5 + i) * r;
        const y = Math.sin(this.time * 0.3 + i) * r;
        ctx.fillStyle = this.hexToRgba(palette[i % palette.length], 0.3 + beat * 0.2);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 15 + beat * 10), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // --- Spectrum Wave ---
  private renderSpectrumWave(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('spectrum_wave');
    const spectrum = this.analysis?.frequencySpectrum ?? new Array(64).fill(0.3);
    const bars = spectrum.length;
    const barW = 800 / bars;
    for (let i = 0; i < bars; i++) {
      const val = spectrum[i] * (0.5 + beat * 0.5 + this.getSectionEnergy() * 0.5);
      const barH = val * 200;
      const x = -400 + i * barW;
      const grad = ctx.createLinearGradient(0, 0, 0, -barH);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[palette.length - 1]);
      ctx.fillStyle = grad;
      ctx.fillRect(x, -barH / 2, barW - 2, barH);
    }
  }

  // --- Pulse Grid ---
  private renderPulseGrid(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('pulse_grid');
    const gridSize = 40;
    const offset = (this.time * 50) % gridSize;
    ctx.strokeStyle = this.hexToRgba(palette[0], 0.15 + beat * 0.2);
    ctx.lineWidth = 1;
    for (let x = -400 - offset; x < 400; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -300);
      ctx.lineTo(x, 300);
      ctx.stroke();
    }
    for (let y = -300 - offset; y < 300; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-400, y);
      ctx.lineTo(400, y);
      ctx.stroke();
    }
    // Pulse nodes
    for (let i = 0; i < 20; i++) {
      const x = Math.sin(this.time + i) * 300;
      const y = Math.cos(this.time * 1.3 + i) * 200;
      const r = 3 + beat * 8;
      ctx.fillStyle = this.hexToRgba(palette[i % palette.length], 0.6 + beat * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Aurora ---
  private renderAurora(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('aurora_flow');
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const baseY = -100 + i * 80;
      ctx.moveTo(-400, baseY);
      for (let x = -400; x <= 400; x += 10) {
        const y = baseY + Math.sin(x * 0.01 + this.time + i) * 60 + Math.sin(x * 0.005 + this.time * 0.5) * 40 + beat * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(400, 300);
      ctx.lineTo(-400, 300);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, baseY - 50, 0, 300);
      grad.addColorStop(0, this.hexToRgba(palette[i % palette.length], 0.3 + beat * 0.2));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
    }
    // Stars
    for (const star of this.stars.slice(0, 100)) {
      const sx = (star.x / 200) * 400;
      const sy = (star.y / 200) * 200 - 200;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + star.size * 0.2})`;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.1, star.size), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Fire ---
  private renderFire(w: number, h: number, beat: number) {
    this.spawnParticles(5 + Math.floor(beat * 10), w, h, 'fire');
    this.updateAndDrawParticles();
  }

  // --- Smoke ---
  private renderSmoke(w: number, h: number, beat: number) {
    this.spawnParticles(2 + Math.floor(beat * 3), w, h, 'smoke');
    this.updateAndDrawParticles();
  }

  // --- Golden Aura ---
  private renderGoldenAura(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('golden_aura');
    for (let i = 0; i < 5; i++) {
      const r = 50 + i * 60 + beat * 40 + Math.sin(this.time + i) * 20;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, this.hexToRgba(palette[0], 0.3 + beat * 0.2));
      grad.addColorStop(0.7, this.hexToRgba(palette[i % palette.length], 0.1));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    }
    this.spawnParticles(2 + Math.floor(beat * 3), w, h, 'aura');
    this.updateAndDrawParticles();
  }

  // --- Dreamscape ---
  private renderDreamscape(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('dreamscape');
    for (let i = 0; i < 6; i++) {
      const x = Math.sin(this.time * 0.2 + i) * 300;
      const y = Math.cos(this.time * 0.15 + i * 0.7) * 150;
      const r = 80 + Math.sin(this.time + i) * 30 + beat * 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, this.hexToRgba(palette[i % palette.length], 0.3 + beat * 0.15));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    }
    this.spawnParticles(1 + Math.floor(beat * 2), w, h, 'dream');
    this.updateAndDrawParticles();
  }

  // --- Cyberpunk ---
  private renderCyberpunk(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('cyber_grid');
    // Rain
    ctx.strokeStyle = this.hexToRgba(palette[1], 0.3);
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x = ((i * 37 + this.time * 200) % 800) - 400;
      const y = ((i * 53 + this.time * 800) % 600) - 300;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 20);
      ctx.stroke();
    }
    // Neon buildings silhouette
    ctx.fillStyle = this.hexToRgba(palette[3], 0.8);
    for (let i = 0; i < 10; i++) {
      const bw = 60;
      const bh = 100 + (i * 37 % 150);
      const x = -350 + i * 70;
      ctx.fillRect(x, 50 - bh, bw, bh);
    }
    // Neon glow lines
    for (let i = 0; i < 10; i++) {
      const x = -350 + i * 70 + 30;
      const y = 50 - (100 + (i * 37 % 150));
      ctx.fillStyle = this.hexToRgba(palette[i % 3], 0.8 + beat * 0.2);
      ctx.fillRect(x - 2, y, 4, 15);
    }
  }

  // --- Synthwave ---
  private renderSynthwave(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('synthwave');
    // Sun
    const sunR = 120 + beat * 20;
    const sunGrad = ctx.createLinearGradient(0, -sunR, 0, sunR);
    sunGrad.addColorStop(0, palette[0]);
    sunGrad.addColorStop(0.5, palette[1]);
    sunGrad.addColorStop(1, palette[2]);
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(0, -50, Math.max(1, sunR), 0, Math.PI * 2);
    ctx.fill();
    // Sun stripes
    ctx.fillStyle = this.hexToRgba(palette[3], 0.6);
    for (let i = 0; i < 5; i++) {
      const y = -50 + i * 20 - 10;
      ctx.fillRect(-sunR, y, sunR * 2, 4);
    }
    // Grid
    const gridSize = 40;
    const offset = (this.time * 60) % gridSize;
    ctx.strokeStyle = this.hexToRgba(palette[1], 0.4 + beat * 0.2);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 15; i++) {
      const z = i / 15;
      const y = 50 + z * z * 300 + offset * (1 - z);
      if (y > 300) continue;
      ctx.beginPath();
      ctx.moveTo(-400, y);
      ctx.lineTo(400, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 40, 50);
      ctx.lineTo(i * 200, 300);
      ctx.stroke();
    }
  }

  // --- Water ---
  private renderWater(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('water_world');
    // Caustics
    for (let i = 0; i < 30; i++) {
      const x = Math.sin(this.time * 0.5 + i * 0.3) * 300;
      const y = Math.cos(this.time * 0.3 + i * 0.5) * 200;
      const r = 20 + Math.sin(this.time + i) * 10 + beat * 15;
      ctx.fillStyle = this.hexToRgba(palette[2], 0.05 + beat * 0.05);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    }
    this.spawnParticles(1 + Math.floor(beat * 2), w, h, 'bubble');
    this.updateAndDrawParticles();
  }

  // --- Forest ---
  private renderForest(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('forest_realm');
    // God rays
    for (let i = 0; i < 6; i++) {
      const angle = -0.3 + i * 0.15 + Math.sin(this.time * 0.2) * 0.05;
      ctx.save();
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, -300, 0, 100);
      grad.addColorStop(0, this.hexToRgba(palette[2], 0.1 + beat * 0.05));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(-30 + i * 10, -300, 60, 400);
      ctx.restore();
    }
    this.spawnParticles(1 + Math.floor(beat * 2), w, h, 'firefly');
    this.updateAndDrawParticles();
  }

  // --- Temple ---
  private renderTemple(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('temple_divine');
    // Divine rays from top
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI - Math.PI / 2 + Math.sin(this.time * 0.1) * 0.1;
      const len = 300 + beat * 100;
      ctx.strokeStyle = this.hexToRgba(palette[0], 0.15 + beat * 0.15);
      ctx.lineWidth = 8 + beat * 4;
      ctx.beginPath();
      ctx.moveTo(0, -200);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len - 200);
      ctx.stroke();
    }
    // Central glow
    const grad = ctx.createRadialGradient(0, -100, 0, 0, -100, 150 + beat * 50);
    grad.addColorStop(0, this.hexToRgba(palette[2], 0.4 + beat * 0.3));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -100, Math.max(1, 150 + beat * 50), 0, Math.PI * 2);
    ctx.fill();
    this.spawnParticles(2 + Math.floor(beat * 3), w, h, 'divine');
    this.updateAndDrawParticles();
  }

  // --- Anime ---
  private renderAnime(w: number, h: number, beat: number) {
    this.spawnParticles(3 + Math.floor(beat * 5), w, h, 'sakura');
    this.updateAndDrawParticles();
    const { ctx } = this;
    const palette = this.getPaletteForPreset('anime_world');
    // Soft sun glow
    const grad = ctx.createRadialGradient(100, -100, 0, 100, -100, 200);
    grad.addColorStop(0, this.hexToRgba(palette[2], 0.3 + beat * 0.1));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(100, -100, 200, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Epic ---
  private renderEpic(w: number, h: number, beat: number) {
    this.spawnParticles(4 + Math.floor(beat * 8), w, h, 'fire');
    this.updateAndDrawParticles();
    const { ctx } = this;
    const palette = this.getPaletteForPreset('epic_cinematic');
    // Lens flare
    const grad = ctx.createRadialGradient(-200, -150, 0, -200, -150, 100 + beat * 50);
    grad.addColorStop(0, this.hexToRgba(palette[3], 0.4 + beat * 0.3));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-200, -150, Math.max(1, 100 + beat * 50), 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Minimal ---
  private renderMinimal(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('minimal_clean');
    for (let i = 0; i < 5; i++) {
      const r = 50 + i * 50 + beat * 20;
      ctx.strokeStyle = this.hexToRgba(palette[0], 0.1 + beat * 0.1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Rotating line
    ctx.strokeStyle = this.hexToRgba(palette[0], 0.5 + beat * 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(this.time) * 200, Math.sin(this.time) * 200);
    ctx.stroke();
  }

  // --- Luxury ---
  private renderLuxury(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('luxury_gold');
    for (let i = 0; i < 3; i++) {
      const r = 100 + i * 80 + beat * 30;
      const grad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, this.hexToRgba(palette[0], 0.1 + beat * 0.1));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    }
    this.spawnParticles(1 + Math.floor(beat * 2), w, h, 'gold');
    this.updateAndDrawParticles();
  }

  // --- Retro VHS ---
  private renderRetroVHS(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('retro_vhs');
    // Scanlines
    for (let y = -300; y < 300; y += 4) {
      ctx.fillStyle = this.hexToRgba(palette[3], 0.1);
      ctx.fillRect(-400, y, 800, 2);
    }
    // Glitch bars
    if (beat > 0.6) {
      const gy = (Math.random() - 0.5) * 400;
      ctx.fillStyle = this.hexToRgba(palette[Math.floor(Math.random() * 3)], 0.3);
      ctx.fillRect(-400, gy, 800, 20 + Math.random() * 30);
    }
    // Moving gradient
    const grad = ctx.createLinearGradient(-300, 0, 300, 0);
    grad.addColorStop(0, this.hexToRgba(palette[0], 0.2 + beat * 0.2));
    grad.addColorStop(0.5, this.hexToRgba(palette[1], 0.2 + beat * 0.2));
    grad.addColorStop(1, this.hexToRgba(palette[2], 0.2 + beat * 0.2));
    ctx.fillStyle = grad;
    ctx.fillRect(-400, -300, 800, 600);
  }

  // --- Fractal ---
  private renderFractal(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('fractal_flow');
    const maxDepth = 5 + Math.floor(beat * 3);
    const drawBranch = (x: number, y: number, angle: number, len: number, depth: number) => {
      if (depth <= 0 || len < 2) return;
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      ctx.strokeStyle = this.hexToRgba(palette[depth % palette.length], 0.3 + beat * 0.2);
      ctx.lineWidth = Math.max(0.5, depth * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const rot = 0.5 + Math.sin(this.time + depth) * 0.3;
      drawBranch(x2, y2, angle - rot, len * 0.7, depth - 1);
      drawBranch(x2, y2, angle + rot, len * 0.7, depth - 1);
    };
    drawBranch(0, 100, -Math.PI / 2, 80 + beat * 30, maxDepth);
  }

  // --- Liquid ---
  private renderLiquid(w: number, h: number, beat: number) {
    const { ctx } = this;
    const palette = this.getPaletteForPreset('liquid_flow');
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const points = 30;
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const r = 100 + i * 30 + Math.sin(angle * 3 + this.time + i) * 40 + beat * 30;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = this.hexToRgba(palette[i % palette.length], 0.1 + beat * 0.1);
      ctx.fill();
    }
  }

  // --- Camera ---
  private updateCamera(beat: number) {
    const cam = this.config.camera;
    if (!cam) {
      // Default gentle motion
      this.cameraOffset.x = Math.sin(this.time * 0.3) * 20;
      this.cameraOffset.y = Math.cos(this.time * 0.2) * 15;
      this.cameraOffset.zoom = 1 + Math.sin(this.time * 0.15) * 0.05 + beat * 0.03;
      this.cameraOffset.rotation = 0;
      return;
    }
    const speed = cam.speed ?? 0.5;
    const t = this.time * speed;
    switch (cam.movement) {
      case 'zoom':
        this.cameraOffset.zoom = 1 + Math.sin(t * 0.5) * 0.15 + beat * 0.05;
        this.cameraOffset.x = 0; this.cameraOffset.y = 0; this.cameraOffset.rotation = 0;
        break;
      case 'pan':
        this.cameraOffset.x = Math.sin(t * 0.3) * 60;
        this.cameraOffset.y = 0;
        this.cameraOffset.zoom = 1; this.cameraOffset.rotation = 0;
        break;
      case 'orbit':
        this.cameraOffset.x = Math.cos(t * 0.4) * 40;
        this.cameraOffset.y = Math.sin(t * 0.4) * 30;
        this.cameraOffset.rotation = Math.sin(t * 0.2) * 0.1;
        this.cameraOffset.zoom = 1 + Math.sin(t * 0.3) * 0.05;
        break;
      case 'tracking':
        this.cameraOffset.x = Math.sin(t * 0.2) * 80;
        this.cameraOffset.y = Math.cos(t * 0.15) * 40;
        this.cameraOffset.zoom = 1; this.cameraOffset.rotation = 0;
        break;
      case 'dolly':
        this.cameraOffset.zoom = 1 + Math.sin(t * 0.25) * 0.2;
        this.cameraOffset.x = Math.sin(t * 0.1) * 20;
        this.cameraOffset.y = 0; this.cameraOffset.rotation = 0;
        break;
      case 'tilt':
        this.cameraOffset.y = Math.sin(t * 0.3) * 50;
        this.cameraOffset.x = 0; this.cameraOffset.zoom = 1; this.cameraOffset.rotation = 0;
        break;
      case 'roll':
        this.cameraOffset.rotation = Math.sin(t * 0.3) * 0.15;
        this.cameraOffset.x = 0; this.cameraOffset.y = 0; this.cameraOffset.zoom = 1;
        break;
      case 'crane':
        this.cameraOffset.y = Math.sin(t * 0.2) * 80;
        this.cameraOffset.zoom = 1 + Math.sin(t * 0.1) * 0.08;
        this.cameraOffset.x = 0; this.cameraOffset.rotation = 0;
        break;
      case 'parallax':
        this.cameraOffset.x = Math.sin(t * 0.2) * 30;
        this.cameraOffset.y = Math.cos(t * 0.25) * 20;
        this.cameraOffset.zoom = 1 + Math.sin(t * 0.15) * 0.04;
        this.cameraOffset.rotation = Math.sin(t * 0.1) * 0.03;
        break;
      default:
        this.cameraOffset.x = 0; this.cameraOffset.y = 0; this.cameraOffset.zoom = 1; this.cameraOffset.rotation = 0;
    }
    // Shake
    if (cam.shake > 0) {
      this.cameraOffset.x += (Math.random() - 0.5) * cam.shake * 20 * (1 + beat);
      this.cameraOffset.y += (Math.random() - 0.5) * cam.shake * 20 * (1 + beat);
    }
  }

  // --- Image Layers ---
  private drawImageLayers(w: number, h: number, beat: number) {
    const layers = this.config.imageLayers;
    if (!layers || layers.length === 0) return;
    const t = this.getCurrentTime();
    const { ctx } = this;
    const glow = this.config.glowIntensity ?? 0.5;

    for (const layer of layers) {
      if (t < layer.start || t > layer.start + layer.duration) continue;
      const img = this.getImage(layer.url);
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const elapsed = t - layer.start;
      const totalDur = layer.duration;
      const progress = elapsed / totalDur; // 0-1
      const opacity = layer.opacity ?? 0.85;
      const scale = layer.scale ?? 0.3;
      const x = (layer.x ?? 0) * w * 0.3;
      const y = (layer.y ?? 0) * h * 0.3;
      const anim = layer.animation ?? 'float';
      const animSpeed = layer.animationSpeed ?? 'normal';
      const beatSync = layer.beatSync ?? false;
      const frameMode = layer.frameMode ?? false;
      const frameStyle = layer.frameStyle ?? 'none';
      const transitionIn = layer.transitionIn ?? 'fade';

      // Speed multiplier
      const speedMul = animSpeed === 'slow' ? 0.4 : animSpeed === 'fast' ? 1.8 : 1;
      const beatVal = beatSync ? beat : 0;

      let offsetX = 0, offsetY = 0, rotation = 0, pulseScale = 1;
      let enterAlpha = 1, enterOffsetX = 0, enterOffsetY = 0, enterScale = 1;

      // Enter transition (first 15% of duration)
      const enterProgress = Math.min(1, progress / 0.15);
      if (enterProgress < 1) {
        switch (transitionIn) {
          case 'fade': enterAlpha = enterProgress; break;
          case 'slide-left': enterAlpha = enterProgress; enterOffsetX = (1 - enterProgress) * -200; break;
          case 'slide-right': enterAlpha = enterProgress; enterOffsetX = (1 - enterProgress) * 200; break;
          case 'zoom': enterAlpha = enterProgress; enterScale = 0.3 + enterProgress * 0.7; break;
          case 'bounce': enterAlpha = Math.min(1, enterProgress * 2); enterOffsetY = -Math.abs(Math.sin(enterProgress * Math.PI * 2)) * 50; break;
          case 'flip': enterAlpha = enterProgress; rotation = (1 - enterProgress) * Math.PI; break;
          case 'cut': enterAlpha = 1; break;
        }
      }

      // Exit transition (last 10%)
      const exitProgress = progress > 0.9 ? (progress - 0.9) / 0.1 : 0;
      let exitAlpha = 1;
      if (exitProgress > 0) {
        exitAlpha = 1 - exitProgress;
      }

      // Continuous animation
      switch (anim) {
        case 'float':
          offsetY = Math.sin(this.time * 1.5 * speedMul) * 15;
          break;
        case 'pulse':
          pulseScale = 1 + (beatSync ? beatVal * 0.2 : Math.sin(this.time * 3 * speedMul) * 0.08);
          break;
        case 'rotate':
          rotation += this.time * 0.5 * speedMul;
          break;
        case 'slide':
          offsetX = Math.sin(this.time * 0.8 * speedMul) * 30;
          break;
        case 'bounce':
          offsetY = Math.abs(Math.sin(this.time * 2 * speedMul)) * -20;
          break;
        case 'shake':
          offsetX = (Math.random() - 0.5) * 6 * speedMul;
          offsetY = (Math.random() - 0.5) * 6 * speedMul;
          break;
        case 'zoom-in':
          pulseScale = 1 + progress * 0.5;
          break;
        case 'zoom-out':
          pulseScale = 1.5 - progress * 0.5;
          break;
        case 'fade':
          enterAlpha *= progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
          break;
        case 'static': break;
      }

      // Beat-sync pulse
      if (beatSync && anim !== 'pulse') {
        pulseScale *= 1 + beatVal * 0.1;
      }

      const drawW = img.naturalWidth * scale * pulseScale * enterScale;
      const drawH = img.naturalHeight * scale * pulseScale * enterScale;
      const finalX = w / 2 + x + offsetX + enterOffsetX;
      const finalY = h / 2 + y + offsetY + enterOffsetY;
      const finalAlpha = opacity * enterAlpha * exitAlpha;

      ctx.save();
      ctx.globalAlpha = finalAlpha;
      ctx.translate(finalX, finalY);
      ctx.rotate(rotation);

      // Draw frame if enabled
      if (frameMode && frameStyle !== 'none') {
        this.drawImageFrame(ctx, drawW, drawH, frameStyle, glow, beatVal);
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  private drawImageFrame(ctx: CanvasRenderingContext2D, w: number, h: number, style: string, glow: number, beat: number) {
    const pad = 12;
    const fw = w + pad * 2;
    const fh = h + pad * 2;

    ctx.save();
    switch (style) {
      case 'rounded':
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 12);
        ctx.stroke();
        break;
      case 'polaroid':
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
        // Bottom strip
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(-fw / 2, h / 2, fw, pad * 3);
        break;
      case 'neon':
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2 + beat * 3;
        ctx.shadowBlur = 15 + beat * 20;
        ctx.shadowColor = '#00f5ff';
        roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 8);
        ctx.stroke();
        break;
      case 'glow':
        ctx.strokeStyle = 'rgba(59,130,246,0.6)';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20 * glow;
        ctx.shadowColor = 'rgba(59,130,246,0.5)';
        roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 10);
        ctx.stroke();
        break;
      case 'film':
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
        // Film perforations
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 8; i++) {
          const px = -fw / 2 + 4 + i * (fw / 8);
          ctx.fillRect(px, -fh / 2 + 2, fw / 10, 4);
          ctx.fillRect(px, fh / 2 - 6, fw / 10, 4);
        }
        break;
    }
    ctx.restore();
  }

  // --- Text Overlays (kinetic typography) ---
  private drawTextOverlays(w: number, h: number, beat: number) {
    const overlays = this.config.textOverlays;
    if (!overlays || overlays.length === 0) return;
    const t = this.getCurrentTime();
    const { ctx } = this;
    const glow = this.config.glowIntensity ?? 0.5;

    for (const overlay of overlays) {
      if (t < overlay.start || t > overlay.start + overlay.duration) continue;
      const progress = (t - overlay.start) / overlay.duration; // 0-1
      const style = overlay.style ?? 'kinetic';
      const color = overlay.color ?? '#ffffff';
      const size = (overlay.size ?? 1) * 48;
      let alpha = 1;
      let offsetY = 0;
      let scale = 1;

      switch (style) {
        case 'fade':
          alpha = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
          break;
        case 'typewriter': {
          const chars = Math.floor(overlay.text.length * Math.min(1, progress * 2));
          alpha = 1;
          break;
        }
        case 'bounce':
          offsetY = Math.sin(progress * Math.PI * 3) * 20 * (1 - progress);
          scale = 1 + beat * 0.1;
          break;
        case 'glitch':
          alpha = 0.7 + Math.random() * 0.3;
          offsetY = (Math.random() - 0.5) * 4;
          break;
        case 'kinetic':
        default:
          alpha = progress < 0.1 ? progress / 0.1 : progress > 0.9 ? (1 - progress) / 0.1 : 1;
          scale = 1 + beat * 0.08;
          offsetY = (1 - Math.min(1, progress * 3)) * 30;
          break;
      }

      const displayText = style === 'typewriter'
        ? overlay.text.slice(0, Math.floor(overlay.text.length * Math.min(1, progress * 2)))
        : overlay.text;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${size * scale}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (glow > 0.3) {
        ctx.shadowBlur = 20 * glow;
        ctx.shadowColor = color;
      }
      // Word wrap
      const maxWidth = w * 0.8;
      const lines = wrapText(ctx, displayText, maxWidth);
      const lineHeight = size * scale * 1.2;
      const startY = h / 2 + offsetY - (lines.length - 1) * lineHeight / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
      }
      ctx.restore();
    }
  }

  // --- Character Messages (in-world character speaking) ---
  private drawCharacterMessages(w: number, h: number, beat: number) {
    const msgs = this.config.characterMessages;
    if (!msgs || msgs.length === 0) return;
    const t = this.getCurrentTime();
    const { ctx } = this;
    const glow = this.config.glowIntensity ?? 0.5;

    for (const msg of msgs) {
      if (t < msg.startTime || t > msg.startTime + msg.duration) continue;
      const progress = (t - msg.startTime) / msg.duration;
      const alpha = progress < 0.08 ? progress / 0.08 : progress > 0.92 ? (1 - progress) / 0.08 : 1;

      const charScale = msg.scale ?? 1;
      const charX = msg.position === 'left' ? w * 0.2 : msg.position === 'right' ? w * 0.8 : w * 0.5;
      const charY = h * 0.65;

      // Enter animation
      let enterOffsetX = 0, enterOffsetY = 0, enterAlpha = 1, enterScale = 1;
      const enterProgress = Math.min(1, progress / 0.12);
      const enterAnim = msg.enterAnimation ?? 'pop-in';
      if (enterProgress < 1) {
        switch (enterAnim) {
          case 'walk-in':
            enterOffsetX = (1 - enterProgress) * (msg.position === 'right' ? 300 : -300);
            enterAlpha = enterProgress;
            break;
          case 'slide-in':
            enterOffsetX = (1 - enterProgress) * (msg.position === 'right' ? 200 : -200);
            enterAlpha = enterProgress;
            break;
          case 'fade-in':
            enterAlpha = enterProgress;
            break;
          case 'bounce-in':
            enterOffsetY = -Math.abs(Math.sin(enterProgress * Math.PI * 2)) * 80;
            enterAlpha = Math.min(1, enterProgress * 2);
            break;
          case 'pop-in':
            enterScale = 0.3 + enterProgress * 0.7;
            enterAlpha = enterProgress;
            break;
        }
      }

      // Talking mouth — oscillate while message is "being spoken"
      const isTalking = (msg.talking ?? true) && progress > 0.1 && progress < 0.85;
      const mouthOpen = isTalking ? (Math.sin(this.time * 12) * 0.5 + 0.5) * 6 + 2 : 0;

      ctx.save();
      ctx.translate(charX + enterOffsetX, charY + enterOffsetY);
      ctx.scale(charScale * enterScale, charScale * enterScale);
      ctx.globalAlpha = alpha * enterAlpha;
      this.drawCharacter(ctx, msg.characterType, msg.emotion, 0, 0, beat, 1, mouthOpen);
      ctx.restore();

      // Speech bubble
      if (msg.message) {
        const bubbleStyle = msg.bubbleStyle ?? 'speech';
        const bubbleY = charY - 120 * charScale;
        this.drawSpeechBubble(ctx, msg.message, charX + enterOffsetX, bubbleY, w, alpha * enterAlpha, glow, bubbleStyle, progress);
      }
    }
  }

  private drawCharacter(ctx: CanvasRenderingContext2D, type: CharacterType, emotion: CharacterEmotion, x: number, y: number, beat: number, alpha: number, mouthOpen: number = 0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Character body colors
    const colors: Record<CharacterType, { skin: string; hair: string; body: string; accent: string }> = {
      boy: { skin: '#f4c89a', hair: '#3a2818', body: '#3b82f6', accent: '#1e40af' },
      girl: { skin: '#f4c89a', hair: '#8b4513', body: '#ec4899', accent: '#be185d' },
      robot: { skin: '#a8a8b8', hair: '#666680', body: '#06b6d4', accent: '#0e7490' },
      man: { skin: '#d4a574', hair: '#1a1a1a', body: '#1e293b', accent: '#0f172a' },
      woman: { skin: '#f4c89a', hair: '#6b3a1a', body: '#a855f7', accent: '#7e22ce' },
      elder: { skin: '#d4a574', hair: '#e0e0e0', body: '#64748b', accent: '#334155' },
      anime_boy: { skin: '#ffe0c0', hair: '#1e3a5f', body: '#2563eb', accent: '#1e40af' },
      anime_girl: { skin: '#ffe0c0', hair: '#ff69b4', body: '#f59e0b', accent: '#d97706' },
      mascot: { skin: '#fbbf24', hair: '#f59e0b', body: '#f97316', accent: '#c2410c' },
    };
    const c = colors[type] ?? colors.boy;
    const bobY = Math.sin(this.time * 2) * 3 + beat * 5;

    // Shadow under character
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 82 + bobY, 35, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(x, y + 40 + bobY, 30, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body accent (shirt detail)
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.ellipse(x, y + 55 + bobY, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.ellipse(x - 28, y + 35 + bobY, 8, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 28, y + 35 + bobY, 8, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(x, y - 10 + bobY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = c.hair;
    if (type === 'robot') {
      ctx.fillRect(x - 28, y - 38 + bobY, 56, 12);
      ctx.fillRect(x - 6, y - 48 + bobY, 12, 12);
      // Antenna tip
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y - 50 + bobY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'elder' || type === 'man' || type === 'woman') {
      ctx.beginPath();
      ctx.arc(x, y - 18 + bobY, 30, Math.PI, 0);
      ctx.fill();
    } else if (type === 'anime_boy' || type === 'anime_girl') {
      // Spiky anime hair
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 18 + bobY);
      ctx.lineTo(x - 20, y - 38 + bobY);
      ctx.lineTo(x - 10, y - 28 + bobY);
      ctx.lineTo(x, y - 42 + bobY);
      ctx.lineTo(x + 10, y - 28 + bobY);
      ctx.lineTo(x + 20, y - 38 + bobY);
      ctx.lineTo(x + 28, y - 18 + bobY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 18 + bobY, 30, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 28, y - 18 + bobY, 8, 20);
      ctx.fillRect(x + 20, y - 18 + bobY, 8, 20);
    }

    // Eyes — vary by emotion
    ctx.fillStyle = '#1a1a1a';
    const eyeY = y - 8 + bobY;
    const eyeOffset = 9;
    const eyeSize = emotion === 'surprised' ? 6 : emotion === 'angry' ? 3 : 4;
    const blink = Math.sin(this.time * 0.3) > 0.97 ? 0.1 : 1; // occasional blink

    if (emotion === 'happy' || emotion === 'excited') {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x - eyeOffset, eyeY, 5, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + eyeOffset, eyeY, 5, Math.PI, 0);
      ctx.stroke();
    } else if (emotion === 'sad') {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x - eyeOffset, eyeY + 3, 5, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + eyeOffset, eyeY + 3, 5, 0, Math.PI);
      ctx.stroke();
      // Tear
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(x - eyeOffset, eyeY + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (emotion === 'angry') {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - eyeOffset - 5, eyeY - 4);
      ctx.lineTo(x - eyeOffset + 5, eyeY);
      ctx.moveTo(x + eyeOffset + 5, eyeY - 4);
      ctx.lineTo(x + eyeOffset - 5, eyeY);
      ctx.stroke();
    } else {
      // Normal/surprised — circles with blink
      ctx.beginPath();
      ctx.ellipse(x - eyeOffset, eyeY, eyeSize, eyeSize * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + eyeOffset, eyeY, eyeSize, eyeSize * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sparkle in eyes for surprised
      if (emotion === 'surprised') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - eyeOffset + 2, eyeY - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset + 2, eyeY - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Eyebrows for angry/sad
    if (emotion === 'angry') {
      ctx.strokeStyle = c.hair;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - eyeOffset - 6, eyeY - 10);
      ctx.lineTo(x - eyeOffset + 4, eyeY - 6);
      ctx.moveTo(x + eyeOffset + 6, eyeY - 10);
      ctx.lineTo(x + eyeOffset - 4, eyeY - 6);
      ctx.stroke();
    } else if (emotion === 'sad') {
      ctx.strokeStyle = c.hair;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - eyeOffset - 6, eyeY - 8);
      ctx.lineTo(x - eyeOffset + 4, eyeY - 10);
      ctx.moveTo(x + eyeOffset + 6, eyeY - 8);
      ctx.lineTo(x + eyeOffset - 4, eyeY - 10);
      ctx.stroke();
    }

    // Mouth — varies by emotion + talking animation
    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = '#8b2c3d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const mouthY = y + 8 + bobY;
    if (mouthOpen > 0) {
      // Talking — open mouth
      ctx.ellipse(x, mouthY, 6, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, mouthY, 6, mouthOpen, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (emotion === 'happy' || emotion === 'excited') {
      ctx.arc(x, mouthY - 2, 10, 0, Math.PI);
      ctx.stroke();
    } else if (emotion === 'sad') {
      ctx.arc(x, mouthY + 8, 10, Math.PI, 0);
      ctx.stroke();
    } else if (emotion === 'angry') {
      ctx.moveTo(x - 8, mouthY + 2);
      ctx.lineTo(x + 8, mouthY - 2);
      ctx.stroke();
    } else if (emotion === 'surprised') {
      ctx.arc(x, mouthY, 5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(x - 8, mouthY);
      ctx.lineTo(x + 8, mouthY);
      ctx.stroke();
    }

    // Blush for happy/excited
    if (emotion === 'happy' || emotion === 'excited') {
      ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
      ctx.beginPath();
      ctx.arc(x - 14, y + 2 + bobY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 14, y + 2 + bobY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glow aura for excited
    if (emotion === 'excited') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fbbf24';
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y + 10 + bobY, 45, 0, Math.PI * 2);
      ctx.stroke();
      // Sparkle particles around
      for (let i = 0; i < 5; i++) {
        const a = this.time * 2 + i * 1.2;
        const sx = x + Math.cos(a) * 50;
        const sy = y + 10 + bobY + Math.sin(a) * 50;
        ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(this.time * 3 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxCanvasW: number, alpha: number, glow: number, style: string, progress: number) {
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = '600 18px Inter, sans-serif';
    const maxWidth = Math.min(maxCanvasW * 0.4, 300);
    const lines = wrapText(ctx, text, maxWidth);
    const padding = 12;
    const lineHeight = 22;
    const bubbleW = Math.min(maxWidth + padding * 2, 320);
    const bubbleH = lines.length * lineHeight + padding * 2 + 10;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - bubbleH;

    // Bubble background
    if (style === 'shout') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
    } else if (style === 'thought') {
      ctx.fillStyle = 'rgba(15, 17, 25, 0.92)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = 'rgba(15, 17, 25, 0.92)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
    }

    if (glow > 0.3) {
      ctx.shadowBlur = 15 * glow;
      ctx.shadowColor = style === 'shout' ? 'rgba(239,68,68,0.4)' : 'rgba(59, 130, 246, 0.3)';
    }

    if (style === 'shout') {
      // Spiky bubble for shout
      ctx.beginPath();
      const spikes = 12;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i / (spikes * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? bubbleW / 2 + 10 : bubbleW / 2 - 5;
        const px = x + Math.cos(angle) * r;
        const py = bubbleY + bubbleH / 2 + Math.sin(angle) * (bubbleH / 2 + 10);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, style === 'thought' ? 50 : 12);
      ctx.fill();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Tail
    if (style !== 'thought') {
      ctx.fillStyle = style === 'shout' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 17, 25, 0.92)';
      ctx.beginPath();
      ctx.moveTo(x - 8, bubbleY + bubbleH);
      ctx.lineTo(x + 8, bubbleY + bubbleH);
      ctx.lineTo(x, bubbleY + bubbleH + 12);
      ctx.closePath();
      ctx.fill();
    } else {
      // Thought bubble circles
      ctx.fillStyle = 'rgba(15, 17, 25, 0.92)';
      ctx.beginPath();
      ctx.arc(x - 5, bubbleY + bubbleH + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 10, bubbleY + bubbleH + 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text — typewriter effect for first 60% of duration
    const displayText = progress < 0.6 ? text.slice(0, Math.ceil(text.length * (progress / 0.6))) : text;
    const displayLines = wrapText(ctx, displayText, maxWidth);

    ctx.fillStyle = style === 'shout' ? '#ffffff' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < displayLines.length; i++) {
      ctx.fillText(displayLines[i], x, bubbleY + padding + i * lineHeight);
    }

    ctx.restore();
  }

  // --- Post FX ---
  private drawPostFX(w: number, h: number, beat: number) {
    const { ctx } = this;
    const glow = this.config.glowIntensity ?? 0.5;
    // Vignette
    const vGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, `rgba(0,0,0,${0.4 + glow * 0.2})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
    // Beat flash
    if (this.beatPulse > 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${this.beatPulse * 0.05 * glow})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // --- Particle system ---
  private spawnParticles(count: number, w: number, h: number, type: string) {
    const density = this.config.particleDensity ?? 0.5;
    const actualCount = Math.floor(count * density);
    const palette = this.config.colorPalette ?? ['#ffffff'];
    for (let i = 0; i < actualCount; i++) {
      const p = this.createParticle(type, palette);
      this.particles.push(p);
    }
    // Cap particles
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
  }

  private createParticle(type: string, palette: string[]): Particle {
    const hue = Math.floor(Math.random() * 360);
    switch (type) {
      case 'fire':
        return { x: (Math.random() - 0.5) * 200, y: 150 + Math.random() * 50, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3, life: 1, maxLife: 60 + Math.random() * 40, size: 3 + Math.random() * 5, hue: 10 + Math.random() * 40, alpha: 0.8 };
      case 'smoke':
        return { x: (Math.random() - 0.5) * 100, y: 100, vx: (Math.random() - 0.5) * 1, vy: -0.5 - Math.random(), life: 1, maxLife: 120 + Math.random() * 60, size: 10 + Math.random() * 20, hue: 0, alpha: 0.15 };
      case 'galaxy':
        return { x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, life: 1, maxLife: 100 + Math.random() * 100, size: 1 + Math.random() * 2, hue, alpha: 0.8 };
      case 'drift':
        return { x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3, life: 1, maxLife: 200, size: 2 + Math.random() * 3, hue, alpha: 0.6 };
      case 'aura':
        return { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, vx: (Math.random() - 0.5) * 1, vy: -1 - Math.random(), life: 1, maxLife: 80, size: 2 + Math.random() * 3, hue: 40 + Math.random() * 20, alpha: 0.7 };
      case 'dream':
        return { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: 1, maxLife: 150, size: 1 + Math.random() * 2, hue: 300 + Math.random() * 60, alpha: 0.5 };
      case 'bubble':
        return { x: (Math.random() - 0.5) * 400, y: 200, vx: (Math.random() - 0.5) * 0.3, vy: -1 - Math.random() * 2, life: 1, maxLife: 100, size: 2 + Math.random() * 4, hue: 190, alpha: 0.4 };
      case 'firefly':
        return { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400, vx: Math.sin(Math.random() * 10) * 0.5, vy: Math.cos(Math.random() * 10) * 0.5, life: 1, maxLife: 80, size: 1 + Math.random() * 2, hue: 60 + Math.random() * 30, alpha: 0.8 };
      case 'divine':
        return { x: (Math.random() - 0.5) * 100, y: -100, vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random(), life: 1, maxLife: 100, size: 2 + Math.random() * 3, hue: 45, alpha: 0.7 };
      case 'sakura':
        return { x: (Math.random() - 0.5) * 600, y: -200, vx: Math.sin(Math.random() * 10) * 0.5, vy: 0.5 + Math.random(), life: 1, maxLife: 200, size: 3 + Math.random() * 3, hue: 330, alpha: 0.7 };
      case 'gold':
        return { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300, vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.5, life: 1, maxLife: 120, size: 1 + Math.random() * 2, hue: 45, alpha: 0.6 };
      default:
        return { x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 600, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, life: 1, maxLife: 100, size: 2, hue, alpha: 0.6 };
    }
  }

  private updateAndDrawParticles() {
    const { ctx } = this;
    const motionSpeed = this.config.motionSpeed ?? 0.5;
    const glow = this.config.glowIntensity ?? 0.5;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (1 + motionSpeed);
      p.y += p.vy * (1 + motionSpeed);
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const alpha = p.alpha * p.life;
      const size = p.size * (0.5 + p.life * 0.5);
      if (glow > 0.3) {
        ctx.shadowBlur = size * 3 * glow;
        ctx.shadowColor = `hsla(${p.hue}, 80%, 60%, ${alpha})`;
      }
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // --- Color utils ---
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private mixColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  }
}

// --- Helper functions ---

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
