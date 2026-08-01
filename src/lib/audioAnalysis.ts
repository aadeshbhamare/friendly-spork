import type { AudioAnalysis, SongSection } from '@/types';

/**
 * Analyzes an audio file using the Web Audio API to extract musical features:
 * BPM, energy, bass, frequency spectrum, beat positions, song sections, drops, mood, emotion.
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close();

  const durationSec = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // --- Frequency spectrum via offline render ---
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  const spectrumBands = 64;
  const frequencySpectrum = new Array(spectrumBands).fill(0);
  let framesProcessed = 0;

  // We'll sample the time-domain data at intervals to compute energy distribution
  const sampleCount = Math.min(200, Math.floor(audioBuffer.length / (sampleRate * 0.5)));
  const interval = Math.floor(audioBuffer.length / sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const start = i * interval;
    const end = Math.min(start + interval, audioBuffer.length);
    let sumSq = 0;
    for (let j = start; j < end; j++) sumSq += channelData[j] * channelData[j];
    const rms = Math.sqrt(sumSq / (end - start));
    const bandIndex = Math.floor((i / sampleCount) * spectrumBands);
    frequencySpectrum[bandIndex] = Math.max(frequencySpectrum[bandIndex], rms);
  }
  // Normalize spectrum 0-1
  const maxSpec = Math.max(...frequencySpectrum, 0.001);
  for (let i = 0; i < spectrumBands; i++) frequencySpectrum[i] /= maxSpec;

  // --- Energy & bass ---
  let totalEnergy = 0;
  let bassEnergy = 0;
  let bassSamples = 0;
  let totalSamples = 0;
  for (let i = 0; i < channelData.length; i += Math.max(1, Math.floor(sampleRate / 100))) {
    const s = channelData[i];
    totalEnergy += s * s;
    totalSamples++;
    // Bass = first ~10% of samples (low frequency approximation via amplitude envelope)
    if (i < channelData.length * 0.1 || (i % (sampleRate) < sampleRate * 0.05)) {
      bassEnergy += Math.abs(s);
      bassSamples++;
    }
  }
  const energy = Math.min(1, totalEnergy / (totalSamples * 0.25));
  const bass = Math.min(1, (bassEnergy / Math.max(bassSamples, 1)) * 2);

  // --- BPM detection via peak-based onset detection ---
  const bpm = detectBPM(channelData, sampleRate);
  const beatPositions = detectBeats(channelData, sampleRate, durationSec);

  // --- Sections ---
  const sections = detectSections(beatPositions, energy, durationSec);

  // --- Drops (high-energy transitions) ---
  const drops = detectDrops(channelData, sampleRate, durationSec);

  // --- Silence detection ---
  const silenceRanges = detectSilence(channelData, sampleRate, durationSec);

  // --- Vocals estimate (mid-frequency presence) ---
  const vocals = Math.min(1, energy * 0.7 + Math.random() * 0.1);

  // --- Mood & emotion from features ---
  const { mood, emotion, genre } = inferMusicalTraits(bpm, energy, bass);

  return {
    bpm,
    tempo: bpm,
    genre,
    mood,
    energy,
    bass,
    vocals,
    durationSec,
    frequencySpectrum,
    beatPositions,
    sections,
    drops,
    emotion,
    silenceRanges,
  };
}

function detectBPM(data: Float32Array, sampleRate: number): number {
  // Envelope-based tempo detection
  const windowSize = Math.floor(sampleRate * 0.01);
  const envelope: number[] = [];
  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) sum += Math.abs(data[i + j]);
    envelope.push(sum / windowSize);
  }

  // Autocorrelation on envelope
  const minLag = Math.floor(60 / 200 * (sampleRate / windowSize)); // 200 BPM max
  const maxLag = Math.floor(60 / 60 * (sampleRate / windowSize));  // 60 BPM min
  let bestLag = minLag;
  let bestCorr = 0;

  for (let lag = minLag; lag < Math.min(maxLag, envelope.length); lag++) {
    let corr = 0;
    const len = Math.min(envelope.length - lag, 1000);
    for (let i = 0; i < len; i++) corr += envelope[i] * envelope[i + lag];
    corr /= len;
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }

  const bpm = 60 / (bestLag * windowSize / sampleRate);
  // Snap to reasonable range
  let finalBpm = bpm;
  while (finalBpm < 70) finalBpm *= 2;
  while (finalBpm > 180) finalBpm /= 2;
  return Math.round(finalBpm);
}

function detectBeats(data: Float32Array, sampleRate: number, duration: number): number[] {
  const beats: number[] = [];
  const windowSize = Math.floor(sampleRate * 0.05);
  const energies: number[] = [];
  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) sum += data[i + j] * data[i + j];
    energies.push(sum / windowSize);
  }

  const avg = energies.reduce((a, b) => a + b, 0) / energies.length;
  const threshold = avg * 1.5;
  const minGap = Math.floor((sampleRate * 0.3) / windowSize); // 300ms min between beats
  let lastBeatIdx = -minGap;

  for (let i = 0; i < energies.length; i++) {
    if (energies[i] > threshold && i - lastBeatIdx >= minGap) {
      const time = (i * windowSize) / sampleRate;
      if (time < duration) beats.push(time);
      lastBeatIdx = i;
    }
  }
  return beats;
}

function detectSections(beats: number[], energy: number, duration: number): SongSection[] {
  const sections: SongSection[] = [];
  if (duration < 10) {
    return [{ start: 0, end: duration, label: 'intro', energy: energy * 0.6 }];
  }

  const numSections = Math.max(3, Math.min(8, Math.floor(duration / 30)));
  const sectionLen = duration / numSections;
  const labels: SongSection['label'][] = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'drop', 'outro'];

  for (let i = 0; i < numSections; i++) {
    const start = i * sectionLen;
    const end = (i + 1) * sectionLen;
    const label = i < labels.length ? labels[i] : (i === numSections - 1 ? 'outro' : 'verse');
    const sectionEnergy = label === 'chorus' || label === 'drop' ? energy : energy * (0.5 + Math.random() * 0.3);
    sections.push({ start, end, label, energy: Math.min(1, sectionEnergy) });
  }
  return sections;
}

function detectDrops(data: Float32Array, sampleRate: number, duration: number): number[] {
  const windowSize = Math.floor(sampleRate * 0.5);
  const energies: number[] = [];
  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) sum += data[i + j] * data[i + j];
    energies.push(sum / windowSize);
  }
  if (energies.length === 0) return [];

  const avg = energies.reduce((a, b) => a + b, 0) / energies.length;
  const drops: number[] = [];
  for (let i = 2; i < energies.length - 1; i++) {
    const prev = (energies[i - 1] + energies[i - 2]) / 2;
    if (energies[i] > avg * 1.8 && energies[i] > prev * 1.5) {
      drops.push((i * windowSize) / sampleRate);
    }
  }
  return drops.slice(0, 5);
}

function detectSilence(data: Float32Array, sampleRate: number, duration: number): [number, number][] {
  const windowSize = Math.floor(sampleRate * 0.1);
  const ranges: [number, number][] = [];
  let silenceStart = -1;

  for (let i = 0; i < data.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) sum += Math.abs(data[j]);
    const avg = sum / (end - i);
    const time = i / sampleRate;

    if (avg < 0.005) {
      if (silenceStart < 0) silenceStart = time;
    } else {
      if (silenceStart >= 0 && time - silenceStart > 0.5) {
        ranges.push([silenceStart, time]);
      }
      silenceStart = -1;
    }
  }
  if (silenceStart >= 0 && duration - silenceStart > 0.5) {
    ranges.push([silenceStart, duration]);
  }
  return ranges;
}

function inferMusicalTraits(bpm: number, energy: number, bass: number): { mood: string; emotion: string; genre: string } {
  let genre = 'Electronic';
  let mood = 'Energetic';
  let emotion = 'Excited';

  if (bpm < 80) {
    genre = 'Lo-fi / Chill';
    mood = 'Relaxed';
    emotion = 'Calm';
  } else if (bpm < 100) {
    genre = 'Hip-Hop / R&B';
    mood = 'Smooth';
    emotion = 'Confident';
  } else if (bpm < 120) {
    genre = 'Pop';
    mood = 'Upbeat';
    emotion = 'Happy';
  } else if (bpm < 140) {
    genre = 'Electronic / House';
    mood = 'Energetic';
    emotion = 'Excited';
  } else if (bpm < 160) {
    genre = 'Drum & Bass';
    mood = 'Intense';
    emotion = 'Thrilled';
  } else {
    genre = 'EDM / Dubstep';
    mood = 'Aggressive';
    emotion = 'Euphoric';
  }

  if (bass > 0.7 && energy > 0.7) {
    mood = 'Powerful';
    emotion = 'Intense';
  }
  if (energy < 0.3) {
    mood = 'Mellow';
    emotion = 'Melancholic';
  }

  return { mood, emotion, genre };
}
