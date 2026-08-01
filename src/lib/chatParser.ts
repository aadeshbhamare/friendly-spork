import type { StyleConfig, ImageLayer, TextOverlay } from '@/types';
import { VISUAL_PRESETS, getPresetById } from './visualPresets';

export interface ParsedCommand {
  intent: string;
  changes: StyleConfig;
  newPreset?: string;
  response: string;
  /** Updates to apply to image layers (by index or all) */
  imageLayerUpdates?: { index?: number; all?: boolean; updates: Partial<import('@/types').ImageLayer> };
  /** Updates to text overlays */
  textOverlayUpdates?: { color?: string; style?: import('@/types').TextOverlay['style']; size?: number };
  /** Remove all text overlays */
  clearTextOverlays?: boolean;
}

/**
 * Parses natural language commands from the AI chatbot into concrete style config changes.
 * The chatbot reuses the existing audio + analysis — it only regenerates visuals.
 */
export function parseChatCommand(input: string): ParsedCommand {
  const text = input.toLowerCase().trim();
  const changes: StyleConfig = {};
  let newPreset: string | undefined;
  const responses: string[] = [];

  // --- Style replacement ---
  for (const preset of VISUAL_PRESETS) {
    const presetName = preset.name.toLowerCase();
    const presetId = preset.id.toLowerCase().replace(/_/g, ' ');
    if (text.includes(presetName) || text.includes(presetId)) {
      newPreset = preset.id;
      changes.effects = preset.defaultConfig.effects;
      changes.colorPalette = preset.defaultConfig.colorPalette;
      changes.particleDensity = preset.defaultConfig.particleDensity;
      changes.glowIntensity = preset.defaultConfig.glowIntensity;
      responses.push(`Switching to ${preset.name} style`);
      break;
    }
  }

  // --- Darker / brighter ---
  if (text.includes('darker') || text.includes('dark') || text.includes('moody')) {
    const palette = changes.colorPalette ?? ['#1a1a2e', '#16213e', '#0f3460'];
    changes.colorPalette = palette.map((c) => darkenColor(c, 0.4));
    responses.push('Making it darker and moodier');
  }
  if (text.includes('colorful') || text.includes('vibrant') || text.includes('bright')) {
    changes.colorPalette = ['#ff006e', '#ffbe0b', '#00f5ff', '#8338ec', '#06ffa5'];
    changes.glowIntensity = 0.8;
    responses.push('Adding vibrant colors');
  }

  // --- Effects ---
  const effectMap: Record<string, string> = {
    'particle': 'particles', 'particles': 'particles',
    'fire': 'fire', 'flame': 'fire',
    'smoke': 'smoke',
    'rain': 'rain', 'raining': 'rain',
    'snow': 'snow',
    'lightning': 'lightning',
    'glow': 'glow', 'glowing': 'glow',
    'neon': 'neon',
    'fog': 'fog', 'mist': 'fog',
    'stars': 'stars', 'star': 'stars',
    'confetti': 'confetti',
    'aura': 'aura',
    'lens flare': 'lensflare', 'lensflare': 'lensflare',
    'god rays': 'godrays', 'godrays': 'godrays', 'god ray': 'godrays',
    'bloom': 'bloom',
  };

  const currentEffects = new Set(changes.effects ?? []);
  for (const [keyword, effect] of Object.entries(effectMap)) {
    if (text.includes(`add ${keyword}`) || text.includes(`use ${keyword}`) || text.includes(`with ${keyword}`) || (text.includes(keyword) && !text.includes('remove'))) {
      currentEffects.add(effect);
      if (!responses.some((r) => r.includes(keyword))) {
        responses.push(`Adding ${keyword} effect`);
      }
    }
  }
  // Remove effects
  for (const [keyword, effect] of Object.entries(effectMap)) {
    if (text.includes(`remove ${keyword}`) || text.includes(`no ${keyword}`) || text.includes(`without ${keyword}`)) {
      currentEffects.delete(effect);
      responses.push(`Removing ${keyword} effect`);
    }
  }
  if (currentEffects.size > 0) changes.effects = Array.from(currentEffects);

  // --- Glow intensity ---
  if (text.includes('increase glow') || text.includes('more glow') || text.includes('brighter glow')) {
    changes.glowIntensity = Math.min(1, (changes.glowIntensity ?? 0.5) + 0.3);
    responses.push('Increasing glow intensity');
  }
  if (text.includes('less glow') || text.includes('reduce glow') || text.includes('decrease glow')) {
    changes.glowIntensity = Math.max(0, (changes.glowIntensity ?? 0.5) - 0.3);
    responses.push('Reducing glow intensity');
  }

  // --- Particles ---
  if (text.includes('more particles') || text.includes('add particles') || text.includes('increase particles')) {
    changes.particleDensity = Math.min(1.5, (changes.particleDensity ?? 0.5) + 0.3);
    responses.push('Increasing particle density');
  }
  if (text.includes('fewer particles') || text.includes('less particles') || text.includes('reduce particles')) {
    changes.particleDensity = Math.max(0, (changes.particleDensity ?? 0.5) - 0.3);
    responses.push('Reducing particle density');
  }

  // --- Camera ---
  const cameraMap: Record<string, StyleConfig['camera']> = {
    'zoom': { movement: 'zoom', speed: 0.5, shake: 0 },
    'pan': { movement: 'pan', speed: 0.5, shake: 0 },
    'orbit': { movement: 'orbit', speed: 0.5, shake: 0 },
    'tracking': { movement: 'tracking', speed: 0.5, shake: 0 },
    'dolly': { movement: 'dolly', speed: 0.5, shake: 0 },
    'tilt': { movement: 'tilt', speed: 0.5, shake: 0 },
    'roll': { movement: 'roll', speed: 0.5, shake: 0 },
    'crane': { movement: 'crane', speed: 0.5, shake: 0 },
    'parallax': { movement: 'parallax', speed: 0.5, shake: 0 },
    '360': { movement: 'orbit', speed: 1, shake: 0 },
  };
  for (const [keyword, cam] of Object.entries(cameraMap)) {
    if (text.includes(`camera ${keyword}`) || text.includes(`${keyword} camera`) || text.includes(`use ${keyword}`)) {
      changes.camera = cam;
      responses.push(`Switching camera to ${keyword}`);
      break;
    }
  }
  if (text.includes('slower camera') || text.includes('slow camera') || text.includes('slower motion')) {
    changes.camera = { ...changes.camera, movement: changes.camera?.movement ?? 'pan', speed: 0.2, shake: 0 };
    changes.motionSpeed = 0.2;
    responses.push('Slowing down camera motion');
  }
  if (text.includes('faster camera') || text.includes('fast camera') || text.includes('faster motion')) {
    changes.camera = { ...changes.camera, movement: changes.camera?.movement ?? 'orbit', speed: 1, shake: 0 };
    changes.motionSpeed = 1;
    responses.push('Speeding up camera motion');
  }
  if (text.includes('camera shake') || text.includes('shake') || text.includes('shaky')) {
    changes.camera = { ...changes.camera, movement: changes.camera?.movement ?? 'tracking', speed: 0.5, shake: 0.5 };
    responses.push('Adding camera shake');
  }
  if (text.includes('static camera') || text.includes('still camera') || text.includes('no camera movement')) {
    changes.camera = { movement: 'static', speed: 0, shake: 0 };
    responses.push('Making camera static');
  }

  // --- Beat sync ---
  if (text.includes('increase beat sync') || text.includes('more beat sync') || text.includes('sync to beat')) {
    changes.beatSync = 1;
    responses.push('Increasing beat synchronization');
  }
  if (text.includes('less beat sync') || text.includes('reduce beat sync') || text.includes('smoother') || text.includes('smooth')) {
    changes.beatSync = 0.3;
    changes.motionSpeed = 0.3;
    responses.push('Making it smoother with less beat sync');
  }

  // --- Cinematic ---
  if (text.includes('cinematic') || text.includes('movie')) {
    changes.camera = { movement: 'dolly', speed: 0.3, shake: 0 };
    changes.glowIntensity = 0.7;
    changes.sceneTransitions = 'crossfade';
    responses.push('Applying cinematic treatment');
  }

  // --- Image position / size / animation via chat ---
  let imageLayerUpdates: ParsedCommand['imageLayerUpdates'];

  // Position changes
  if (text.includes('move image') || text.includes('image position') || text.includes('image left') || text.includes('image right') || text.includes('image center') || text.includes('image top') || text.includes('image bottom')) {
    let x: number | undefined, y: number | undefined;
    if (text.includes('left')) x = -0.7;
    if (text.includes('right')) x = 0.7;
    if (text.includes('center')) x = 0;
    if (text.includes('top')) y = -0.7;
    if (text.includes('bottom')) y = 0.7;
    imageLayerUpdates = { all: true, updates: { x, y } };
    responses.push(`Moving image to ${x !== undefined ? (x < 0 ? 'left' : x > 0 ? 'right' : 'center') : ''} ${y !== undefined ? (y < 0 ? 'top' : 'bottom') : ''}`.trim());
  }

  // Size changes
  if (text.includes('image bigger') || text.includes('bigger image') || text.includes('larger image') || text.includes('image large') || text.includes('make image big')) {
    imageLayerUpdates = { all: true, updates: { scale: 0.55, sizePreset: 'large' } };
    responses.push('Making images larger');
  }
  if (text.includes('image smaller') || text.includes('smaller image') || text.includes('small image') || text.includes('make image small')) {
    imageLayerUpdates = { all: true, updates: { scale: 0.15, sizePreset: 'small' } };
    responses.push('Making images smaller');
  }
  if (text.includes('image medium') || text.includes('medium image')) {
    imageLayerUpdates = { all: true, updates: { scale: 0.3, sizePreset: 'medium' } };
    responses.push('Setting images to medium size');
  }

  // Animation changes via chat
  const animMap: Record<string, ImageLayer['animation']> = {
    'float': 'float', 'floating': 'float',
    'pulse': 'pulse', 'pulsing': 'pulse',
    'rotate': 'rotate', 'rotating': 'rotate', 'spin': 'rotate', 'spinning': 'rotate',
    'slide': 'slide', 'sliding': 'slide',
    'bounce': 'bounce', 'bouncing': 'bounce',
    'shake': 'shake', 'shaking': 'shake',
    'zoom in': 'zoom-in', 'zoom-in': 'zoom-in',
    'zoom out': 'zoom-out', 'zoom-out': 'zoom-out',
    'fade': 'fade', 'fading': 'fade',
    'static': 'static', 'still': 'static',
  };
  if (text.includes('image animation') || text.includes('animate image') || text.includes('image ') && Object.keys(animMap).some(k => text.includes(`image ${k}`))) {
    for (const [keyword, anim] of Object.entries(animMap)) {
      if (text.includes(`image ${keyword}`) || (text.includes('animate image') && text.includes(keyword))) {
        imageLayerUpdates = { all: true, updates: { animation: anim } };
        responses.push(`Changing image animation to ${keyword}`);
        break;
      }
    }
  }

  // Frame style via chat
  if (text.includes('image frame') || text.includes('add frame') || text.includes('neon frame') || text.includes('glow frame') || text.includes('polaroid') || text.includes('film frame')) {
    let frameStyle: ImageLayer['frameStyle'] = 'rounded';
    if (text.includes('neon')) frameStyle = 'neon';
    else if (text.includes('glow')) frameStyle = 'glow';
    else if (text.includes('polaroid')) frameStyle = 'polaroid';
    else if (text.includes('film')) frameStyle = 'film';
    imageLayerUpdates = { all: true, updates: { frameStyle, frameMode: true } };
    responses.push(`Adding ${frameStyle} frame to images`);
  }
  if (text.includes('remove frame') || text.includes('no frame') || text.includes('without frame')) {
    imageLayerUpdates = { all: true, updates: { frameStyle: 'none', frameMode: false } };
    responses.push('Removing frames from images');
  }

  // Beat sync for images
  if (text.includes('image beat sync') || text.includes('sync image') || text.includes('images to beat') || text.includes('image on beat')) {
    imageLayerUpdates = { all: true, updates: { beatSync: true, animationSpeed: 'beat' } };
    responses.push('Syncing images to the beat');
  }

  // Image speed
  if (text.includes('image slow') || text.includes('slow image')) {
    imageLayerUpdates = { all: true, updates: { animationSpeed: 'slow' } };
    responses.push('Slowing down image animation');
  }
  if (text.includes('image fast') || text.includes('fast image')) {
    imageLayerUpdates = { all: true, updates: { animationSpeed: 'fast' } };
    responses.push('Speeding up image animation');
  }

  // --- Text color / style via chat ---
  let textOverlayUpdates: ParsedCommand['textOverlayUpdates'];
  let clearTextOverlays = false;

  // Color detection
  const colorMap: Record<string, string> = {
    'red': '#ff3b3b', 'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#facc15',
    'orange': '#f97316', 'pink': '#ec4899', 'cyan': '#06b6d4', 'white': '#ffffff',
    'black': '#1a1a1a', 'gold': '#fbbf24', 'purple': '#a855f7', 'silver': '#c0c0c0',
    'neon': '#00f5ff', 'rainbow': 'rainbow',
  };
  for (const [colorName, hex] of Object.entries(colorMap)) {
    if (text.includes(`text ${colorName}`) || text.includes(`${colorName} text`) || text.includes(`text color ${colorName}`) || text.includes(`color text ${colorName}`)) {
      textOverlayUpdates = { ...textOverlayUpdates, color: hex };
      responses.push(`Changing text color to ${colorName}`);
      break;
    }
  }

  // Text animation style
  const textStyleMap: Record<string, NonNullable<TextOverlay['style']>> = {
    'typewriter': 'typewriter', 'type writer': 'typewriter',
    'glitch': 'glitch', 'flicker': 'glitch',
    'bounce text': 'bounce', 'bouncing text': 'bounce',
    'fade text': 'fade', 'fading text': 'fade',
    'kinetic': 'kinetic',
  };
  for (const [keyword, style] of Object.entries(textStyleMap)) {
    if (text.includes(keyword)) {
      textOverlayUpdates = { ...textOverlayUpdates, style };
      responses.push(`Changing text animation to ${keyword}`);
      break;
    }
  }

  // Text size
  if (text.includes('text bigger') || text.includes('bigger text') || text.includes('larger text') || text.includes('text large')) {
    textOverlayUpdates = { ...textOverlayUpdates, size: 1.5 };
    responses.push('Making text larger');
  }
  if (text.includes('text smaller') || text.includes('smaller text') || text.includes('small text')) {
    textOverlayUpdates = { ...textOverlayUpdates, size: 0.7 };
    responses.push('Making text smaller');
  }

  // Remove text
  if (text.includes('remove text') || text.includes('hide text') || text.includes('no text') || text.includes('clear text')) {
    clearTextOverlays = true;
    responses.push('Removing text overlays');
  }

  // --- Regenerate ---
  if (text.includes('regenerate') || text.includes('another version') || text.includes('new version') || text.includes('try again')) {
    responses.push('Generating a new version');
  }

  // --- Text animation ---
  if (text.includes('animate text') || text.includes('text animation') || text.includes('kinetic text') || text.includes('typography')) {
    responses.push('Animating text from your uploaded documents');
  }
  if (text.includes('show text') || text.includes('display text') || text.includes('overlay text')) {
    responses.push('Adding text overlay to the video');
  }
  if (text.includes('remove text') || text.includes('hide text') || text.includes('no text')) {
    responses.push('Removing text overlays');
  }

  // --- Character / messaging ---
  if (text.includes('character') || text.includes('boy') || text.includes('girl') || text.includes('robot') || text.includes('person') || text.includes('say') || text.includes('speak') || text.includes('message')) {
    if (text.includes('boy')) { responses.push('Adding a boy character to deliver your message'); }
    else if (text.includes('girl')) { responses.push('Adding a girl character to deliver your message'); }
    else if (text.includes('robot')) { responses.push('Adding a robot character to deliver your message'); }
    else if (text.includes('person') || text.includes('character') || text.includes('say') || text.includes('speak') || text.includes('message')) {
      responses.push('Adding an animated character to interact in the video');
    }
  }
  if (text.includes('trending') || text.includes('viral') || text.includes('interactive')) {
    responses.push('Making it trending-style interactive');
  }

  // --- Image / asset ---
  if (text.includes('use image') || text.includes('show image') || text.includes('add image') || text.includes('use photo') || text.includes('add photo')) {
    responses.push('Adding your uploaded images to the animation');
  }
  if (text.includes('use document') || text.includes('use file') || text.includes('use excel') || text.includes('use spreadsheet') || text.includes('use doc')) {
    responses.push('Extracting and animating content from your uploaded file');
  }

  // --- Platform formats ---
  if (text.includes('youtube')) { responses.push('Generating YouTube 16:9 version'); }
  if (text.includes('instagram') || text.includes('reel')) { responses.push('Generating Instagram Reel 9:16 version'); }
  if (text.includes('tiktok')) { responses.push('Generating TikTok 9:16 version'); }
  if (text.includes('spotify') || text.includes('canvas')) { responses.push('Generating Spotify Canvas version'); }
  if (text.includes('devotional')) { newPreset = 'temple_divine'; responses.push('Generating devotional version'); }
  if (text.includes('fantasy')) { newPreset = 'dreamscape'; responses.push('Generating fantasy version'); }
  if (text.includes('sci-fi') || text.includes('scifi')) { newPreset = 'neon_tunnel'; responses.push('Generating sci-fi version'); }

  const response = responses.length > 0
    ? responses.join('. ') + '.'
    : "I can help with that. Try commands like 'make it darker', 'use Galaxy Flow', 'add fire', 'slower camera', or 'generate TikTok version'.";

  return { intent: text, changes, newPreset, response, imageLayerUpdates, textOverlayUpdates, clearTextOverlays };
}

function darkenColor(hex: string, factor: number): string {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generateAssistantResponse(command: ParsedCommand): string {
  return command.response;
}
