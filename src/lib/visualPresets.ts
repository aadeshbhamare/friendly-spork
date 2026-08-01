import type { AudioAnalysis, StyleConfig } from '@/types';

export interface VisualPreset {
  id: string;
  name: string;
  description: string;
  category: 'abstract' | 'nature' | 'scifi' | 'fantasy' | 'cinematic' | 'artistic';
  icon: string;
  defaultConfig: StyleConfig;
}

export const VISUAL_PRESETS: VisualPreset[] = [
  { id: 'auto', name: 'AI Auto', description: 'Let AI decide everything', category: 'abstract', icon: 'sparkles', defaultConfig: {} },
  { id: 'galaxy_flow', name: 'Galaxy Flow', description: 'Cosmic nebula with drifting stars', category: 'scifi', icon: 'galaxy', defaultConfig: { effects: ['stars', 'nebula', 'glow'], colorPalette: ['#1a1a3e', '#4a3a8e', '#aa3aee'], particleDensity: 0.8, glowIntensity: 0.7 } },
  { id: 'neon_tunnel', name: 'Neon Tunnel', description: 'Retro-futuristic neon corridor', category: 'scifi', icon: 'neon', defaultConfig: { effects: ['neon', 'glow', 'lines'], colorPalette: ['#ff006e', '#00f5ff', '#ffbe0b'], particleDensity: 0.5, glowIntensity: 0.9 } },
  { id: 'particle_drift', name: 'Particle Drift', description: 'Floating particles in soft light', category: 'abstract', icon: 'particles', defaultConfig: { effects: ['particles', 'glow'], colorPalette: ['#3b82f6', '#06b6d4', '#ffffff'], particleDensity: 1, glowIntensity: 0.5 } },
  { id: 'dark_vortex', name: 'Dark Vortex', description: 'Swirling abyss with energy tendrils', category: 'abstract', icon: 'vortex', defaultConfig: { effects: ['smoke', 'energy', 'glow'], colorPalette: ['#0a0a0a', '#1e1e3e', '#4a3a8e'], particleDensity: 0.7, glowIntensity: 0.6 } },
  { id: 'kaleidoscope', name: 'Kaleidoscope', description: 'Symmetric fractal patterns', category: 'artistic', icon: 'kaleidoscope', defaultConfig: { effects: ['fractal', 'glow'], colorPalette: ['#ff006e', '#ffbe0b', '#00f5ff', '#8338ec'], particleDensity: 0.3, glowIntensity: 0.8 } },
  { id: 'spectrum_wave', name: 'Spectrum Wave', description: 'Audio-reactive flowing waves', category: 'abstract', icon: 'wave', defaultConfig: { effects: ['wave', 'glow'], colorPalette: ['#06b6d4', '#3b82f6', '#8338ec'], particleDensity: 0.4, glowIntensity: 0.6 } },
  { id: 'pulse_grid', name: 'Pulse Grid', description: 'Cyber grid pulsing to the beat', category: 'scifi', icon: 'grid', defaultConfig: { effects: ['grid', 'neon', 'glow'], colorPalette: ['#00ff88', '#00f5ff', '#0a0a0a'], particleDensity: 0.3, glowIntensity: 0.7 } },
  { id: 'aurora_flow', name: 'Aurora Flow', description: 'Northern lights in motion', category: 'nature', icon: 'aurora', defaultConfig: { effects: ['aurora', 'stars', 'glow'], colorPalette: ['#00ff88', '#00f5ff', '#8338ec', '#0a0a2e'], particleDensity: 0.6, glowIntensity: 0.8 } },
  { id: 'fire_pulse', name: 'Fire Pulse', description: 'Flames dancing to the rhythm', category: 'cinematic', icon: 'fire', defaultConfig: { effects: ['fire', 'smoke', 'glow'], colorPalette: ['#ff4500', '#ff8c00', '#ffd700', '#1a0500'], particleDensity: 0.9, glowIntensity: 0.8 } },
  { id: 'smoke_flow', name: 'Smoke Flow', description: 'Ethereal smoke trails', category: 'cinematic', icon: 'smoke', defaultConfig: { effects: ['smoke', 'glow'], colorPalette: ['#2a2a2a', '#4a4a6a', '#6a6a8a'], particleDensity: 0.6, glowIntensity: 0.4 } },
  { id: 'golden_aura', name: 'Golden Aura', description: 'Warm golden energy field', category: 'cinematic', icon: 'aura', defaultConfig: { effects: ['aura', 'glow', 'particles'], colorPalette: ['#ffd700', '#ff8c00', '#ff4500', '#1a0a00'], particleDensity: 0.7, glowIntensity: 0.9 } },
  { id: 'dreamscape', name: 'Dreamscape', description: 'Surreal pastel cloudscape', category: 'fantasy', icon: 'dream', defaultConfig: { effects: ['clouds', 'glow', 'particles'], colorPalette: ['#ffb3d9', '#b3d9ff', '#d9b3ff', '#fffde0'], particleDensity: 0.5, glowIntensity: 0.6 } },
  { id: 'cyber_grid', name: 'Cyberpunk', description: 'Rainy neon cityscape', category: 'scifi', icon: 'cyberpunk', defaultConfig: { effects: ['rain', 'neon', 'fog', 'glow'], colorPalette: ['#ff006e', '#00f5ff', '#ffbe0b', '#0a0a14'], particleDensity: 0.7, glowIntensity: 0.9 } },
  { id: 'synthwave', name: 'Synthwave', description: '80s retro sunset grid', category: 'artistic', icon: 'synthwave', defaultConfig: { effects: ['grid', 'sun', 'neon', 'glow'], colorPalette: ['#ff006e', '#ffbe0b', '#8338ec', '#3a0ca3'], particleDensity: 0.4, glowIntensity: 0.8 } },
  { id: 'water_world', name: 'Water World', description: 'Underwater caustics and bubbles', category: 'nature', icon: 'water', defaultConfig: { effects: ['water', 'particles', 'glow'], colorPalette: ['#0077be', '#00b4d8', '#90e0ef', '#03045e'], particleDensity: 0.6, glowIntensity: 0.5 } },
  { id: 'forest_realm', name: 'Forest Realm', description: 'Mystical forest with light rays', category: 'nature', icon: 'forest', defaultConfig: { effects: ['godrays', 'particles', 'fog'], colorPalette: ['#2d5016', '#4a7c2e', '#a8d08d', '#0a1a05'], particleDensity: 0.5, glowIntensity: 0.6 } },
  { id: 'temple_divine', name: 'Devotional', description: 'Sacred temple with divine light', category: 'fantasy', icon: 'temple', defaultConfig: { effects: ['godrays', 'glow', 'particles', 'aura'], colorPalette: ['#ffd700', '#ff8c00', '#fff8dc', '#4a3000'], particleDensity: 0.6, glowIntensity: 0.9 } },
  { id: 'anime_world', name: 'Anime', description: 'Vibrant anime-style scenery', category: 'artistic', icon: 'anime', defaultConfig: { effects: ['particles', 'glow', 'sakura'], colorPalette: ['#ff69b4', '#87ceeb', '#ffd700', '#ffffff'], particleDensity: 0.7, glowIntensity: 0.6 } },
  { id: 'epic_cinematic', name: 'Epic Cinematic', description: 'Blockbuster trailer energy', category: 'cinematic', icon: 'epic', defaultConfig: { effects: ['smoke', 'fire', 'glow', 'lensflare'], colorPalette: ['#1a0a00', '#ff4500', '#ffd700', '#ffffff'], particleDensity: 0.6, glowIntensity: 0.8 } },
  { id: 'minimal_clean', name: 'Minimal', description: 'Clean geometric motion', category: 'artistic', icon: 'minimal', defaultConfig: { effects: ['lines', 'glow'], colorPalette: ['#ffffff', '#e0e0e0', '#a0a0a0', '#0a0a0a'], particleDensity: 0.2, glowIntensity: 0.3 } },
  { id: 'luxury_gold', name: 'Luxury', description: 'Opulent gold and black', category: 'cinematic', icon: 'luxury', defaultConfig: { effects: ['glow', 'particles', 'aura'], colorPalette: ['#ffd700', '#1a1a1a', '#b8860b', '#0a0a0a'], particleDensity: 0.4, glowIntensity: 0.7 } },
  { id: 'retro_vhs', name: 'Retro VHS', description: 'Glitchy 90s tape aesthetic', category: 'artistic', icon: 'retro', defaultConfig: { effects: ['glitch', 'glow', 'lines'], colorPalette: ['#ff00ff', '#00ffff', '#ffff00', '#1a0a2e'], particleDensity: 0.3, glowIntensity: 0.5 } },
  { id: 'fractal_flow', name: 'Fractal Flow', description: 'Infinite recursive patterns', category: 'abstract', icon: 'fractal', defaultConfig: { effects: ['fractal', 'glow', 'particles'], colorPalette: ['#8338ec', '#3a86ff', '#ff006e', '#06ffa5'], particleDensity: 0.5, glowIntensity: 0.7 } },
  { id: 'liquid_flow', name: 'Liquid Flow', description: 'Fluid metallic motion', category: 'abstract', icon: 'liquid', defaultConfig: { effects: ['liquid', 'glow'], colorPalette: ['#06b6d4', '#3b82f6', '#8338ec', '#0a0a2e'], particleDensity: 0.4, glowIntensity: 0.6 } },
];

export function getPresetById(id: string): VisualPreset | undefined {
  return VISUAL_PRESETS.find((p) => p.id === id);
}
