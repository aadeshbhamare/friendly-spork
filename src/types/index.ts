export type Plan = 'free' | 'pro' | 'business' | 'enterprise';
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  plan: Plan;
  credits: number;
  storage_used_mb: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AudioAnalysis {
  bpm: number;
  tempo: number;
  genre: string;
  mood: string;
  energy: number; // 0-1
  bass: number; // 0-1
  vocals: number; // 0-1
  durationSec: number;
  frequencySpectrum: number[]; // downsampled energy per band
  beatPositions: number[]; // seconds
  sections: SongSection[];
  drops: number[]; // seconds
  emotion: string;
  silenceRanges: [number, number][];
}

export interface SongSection {
  start: number;
  end: number;
  label: 'intro' | 'verse' | 'chorus' | 'bridge' | 'drop' | 'outro';
  energy: number;
}

export type VersionStatus = 'draft' | 'rendering' | 'ready' | 'failed';

export interface StyleConfig {
  camera?: CameraConfig;
  effects?: string[];
  colorPalette?: string[];
  particleDensity?: number;
  glowIntensity?: number;
  beatSync?: number; // 0-1
  motionSpeed?: number; // 0-1
  sceneTransitions?: 'cut' | 'crossfade' | 'whip' | 'zoom';
  environment?: string;
  /** Text overlays extracted from uploaded documents/text files */
  textOverlays?: TextOverlay[];
  /** Uploaded image URLs to composite into the scene */
  imageLayers?: ImageLayer[];
  /** Character messages to display in-world */
  characterMessages?: CharacterMessageConfig[];
}

export interface TextOverlay {
  text: string;
  start: number; // seconds
  duration: number; // seconds
  style?: 'kinetic' | 'typewriter' | 'fade' | 'bounce' | 'glitch';
  color?: string;
  size?: number; // relative scale 0.5-2
}

export type ImageSizePreset = 'small' | 'medium' | 'large' | 'custom';
export type ImageAnimationSpeed = 'slow' | 'normal' | 'fast' | 'beat';

export interface ImageLayer {
  url: string;
  name: string;
  start: number; // seconds — when image appears
  duration: number; // seconds — how long it stays
  x?: number; // -1 to 1, 0 = center
  y?: number;
  scale?: number; // 0.1 to 2 — user-adjustable size
  sizePreset?: ImageSizePreset;
  opacity?: number; // 0-1
  animation?: 'float' | 'pulse' | 'rotate' | 'slide' | 'static' | 'bounce' | 'shake' | 'zoom-in' | 'zoom-out' | 'fade';
  animationSpeed?: ImageAnimationSpeed;
  beatSync?: boolean; // if true, animation pulses on beat
  frameMode?: boolean; // if true, image appears in a styled frame/border
  frameStyle?: 'none' | 'rounded' | 'polaroid' | 'neon' | 'glow' | 'film';
  transitionIn?: 'fade' | 'slide-left' | 'slide-right' | 'zoom' | 'bounce' | 'flip' | 'cut';
  transitionOut?: 'fade' | 'slide-left' | 'slide-right' | 'zoom' | 'shrink' | 'cut';
}

export interface CharacterMessageConfig {
  characterType: CharacterType;
  message: string;
  emotion: CharacterEmotion;
  position: 'left' | 'center' | 'right';
  startTime: number;
  duration: number;
  /** Voice animation — mouth moves while speaking */
  talking?: boolean;
  /** Scale of the character 0.5-2 */
  scale?: number;
  /** Background bubble style */
  bubbleStyle?: 'speech' | 'thought' | 'shout' | 'text';
  /** Character enters with animation */
  enterAnimation?: 'walk-in' | 'pop-in' | 'slide-in' | 'fade-in' | 'bounce-in';
}

export type CameraMovement = 'static' | 'zoom' | 'pan' | 'orbit' | 'tracking' | 'dolly' | 'tilt' | 'roll' | 'crane' | 'parallax';

export interface CameraConfig {
  movement: CameraMovement;
  speed: number; // 0-1
  shake: number; // 0-1
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  audio_name: string | null;
  duration_sec: number;
  analysis: AudioAnalysis | Record<string, never>;
  thumbnail_url: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  label: string;
  style_preset: string;
  style_config: StyleConfig;
  chat_prompt: string | null;
  status: VersionStatus;
  progress: number;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_sec: number;
  favorite: boolean;
  created_at: string;
}

export type AssetType = 'background' | 'logo' | 'overlay' | 'font' | 'lyrics' | 'character' | 'subtitle' | 'image' | 'document' | 'spreadsheet' | 'text' | 'video' | 'gif';

export interface Asset {
  id: string;
  user_id: string;
  project_id: string | null;
  type: AssetType;
  name: string;
  url: string;
  mime_type: string | null;
  size_kb: number;
  created_at: string;
  /** Extracted text content for documents/spreadsheets/text files — used for kinetic typography */
  extractedText?: string;
}

export type CharacterType = 'boy' | 'girl' | 'robot' | 'man' | 'woman' | 'elder' | 'anime_boy' | 'anime_girl' | 'mascot';
export type CharacterEmotion = 'happy' | 'sad' | 'excited' | 'angry' | 'surprised' | 'neutral';

export interface CharacterMessage {
  id: string;
  project_id: string;
  user_id: string;
  character_type: CharacterType;
  message: string;
  emotion: CharacterEmotion;
  position: 'left' | 'center' | 'right';
  start_time: number;
  duration: number;
  created_at: string;
}

export type JobStatus = 'queued' | 'processing' | 'rendering' | 'complete' | 'failed';

export interface RenderJob {
  id: string;
  version_id: string;
  user_id: string;
  status: JobStatus;
  progress: number;
  queue_position: number;
  format: string;
  resolution: string;
  aspect_ratio: string;
  fps: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  applied_command: Record<string, unknown> | null;
  created_at: string;
}
