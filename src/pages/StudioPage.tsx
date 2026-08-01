import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, Loader2, Play, Pause, Wand2, Sparkles, Send, MessageSquare, Settings2, Activity, Volume2, Layers, Download, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { analyzeAudio } from '@/lib/audioAnalysis';
import { VisualRenderer } from '@/lib/visualRenderer';
import { VISUAL_PRESETS, getPresetById } from '@/lib/visualPresets';
import { parseChatCommand, type ParsedCommand } from '@/lib/chatParser';
import { MultiAssetUploader } from '@/components/MultiAssetUploader';
import { CharacterMessagePanel } from '@/components/CharacterMessagePanel';
import { formatDuration, cn, clamp } from '@/lib/utils';
import type { AudioAnalysis, StyleConfig, Project, Version, ChatMessage, CameraMovement, TextOverlay, ImageLayer, CharacterMessageConfig } from '@/types';

type StudioStep = 'upload' | 'analyzing' | 'studio';

export function StudioPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rendererRef = useRef<VisualRenderer | null>(null);
  const [step, setStep] = useState<StudioStep>('upload');
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioName, setAudioName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('auto');
  const [styleConfig, setStyleConfig] = useState<StyleConfig>({});
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [characterMessages, setCharacterMessages] = useState<CharacterMessageConfig[]>([]);

  // Load existing project
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      if (data) {
        const proj = data as Project;
        setCurrentProject(proj);
        setAudioUrl(proj.audio_url ?? '');
        setAudioName(proj.audio_name ?? '');
        setAnalysis(proj.analysis as AudioAnalysis ?? null);
        setStep('studio');
      }
    })();
  }, [projectId]);

  // Load versions + chat for existing project
  useEffect(() => {
    if (!currentProject) return;
    (async () => {
      const { data: vData } = await supabase.from('versions').select('*').eq('project_id', currentProject.id).order('version_number', { ascending: false });
      setVersions((vData ?? []) as Version[]);
      const { data: cData } = await supabase.from('chat_messages').select('*').eq('project_id', currentProject.id).order('created_at', { ascending: true });
      setChatMessages((cData ?? []) as ChatMessage[]);
    })();
  }, [currentProject]);

  // Init renderer when entering studio
  useEffect(() => {
    if (step !== 'studio') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1280;
    canvas.height = 720;
    const renderer = new VisualRenderer(canvas);
    rendererRef.current = renderer;
    if (analysis) renderer.setAudioAnalysis(analysis);
    renderer.setPreset(selectedPreset);
    renderer.setStyleConfig(styleConfig);
    renderer.setTextOverlays(textOverlays);
    renderer.setImageLayers(imageLayers);
    renderer.setCharacterMessages(characterMessages);
    if (audioRef.current) renderer.attachAudio(audioRef.current);
    renderer.start();
    return () => renderer.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Update renderer when preset/config changes
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setPreset(selectedPreset);
    rendererRef.current.setStyleConfig(styleConfig);
    if (analysis) rendererRef.current.setAudioAnalysis(analysis);
    rendererRef.current.setTextOverlays(textOverlays);
    rendererRef.current.setImageLayers(imageLayers);
    rendererRef.current.setCharacterMessages(characterMessages);
  }, [selectedPreset, styleConfig, analysis, textOverlays, imageLayers, characterMessages]);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setAudioName(file.name);

    // Upload to Supabase storage
    const filePath = `${user?.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filePath, file, { upsert: false });

    let url = '';
    if (uploadError) {
      // Fallback: use object URL for local playback
      url = URL.createObjectURL(file);
    } else {
      const { data: urlData } = supabase.storage.from('audio').getPublicUrl(filePath);
      url = urlData.publicUrl;
    }
    setAudioUrl(url);

    // Analyze
    setStep('analyzing');
    try {
      const result = await analyzeAudio(file);
      setAnalysis(result);

      // Create project
      const { data: projData } = await supabase.from('projects').insert({
        title: file.name.replace(/\.[^.]+$/, ''),
        audio_url: url,
        audio_name: file.name,
        duration_sec: result.durationSec,
        analysis: result,
      }).select().single();

      if (projData) {
        setCurrentProject(projData as Project);
        setStep('studio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze audio');
      setStep('upload');
    }
  }, [user]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const handleGenerate = async () => {
    if (!currentProject) return;
    setIsRendering(true);
    setRenderProgress(0);

    const versionNumber = (versions[0]?.version_number ?? 0) + 1;
    const preset = getPresetById(selectedPreset);
    const { data: versionData } = await supabase.from('versions').insert({
      project_id: currentProject.id,
      version_number: versionNumber,
      label: `Version ${versionNumber}`,
      style_preset: selectedPreset,
      style_config: { ...preset?.defaultConfig, ...styleConfig },
      status: 'rendering',
    }).select().single();

    // Simulate render progress
    const interval = setInterval(() => {
      setRenderProgress((p) => {
        const next = p + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          (async () => {
            if (versionData) {
              await supabase.from('versions').update({ status: 'ready', progress: 100 }).eq('id', versionData.id);
              const { data: vData } = await supabase.from('versions').select('*').eq('project_id', currentProject.id).order('version_number', { ascending: false });
              setVersions((vData ?? []) as Version[]);
            }
            setIsRendering(false);
          })();
          return 100;
        }
        return next;
      });
    }, 200);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !currentProject) return;
    const userMsg = chatInput.trim();
    setChatInput('');

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      user_id: user!.id,
      role: 'user',
      content: userMsg,
      applied_command: null,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Parse command
    const command: ParsedCommand = parseChatCommand(userMsg);

    // Apply changes
    if (command.newPreset) {
      setSelectedPreset(command.newPreset);
    }
    setStyleConfig((prev) => ({ ...prev, ...command.changes }));

    // Apply image layer updates from chat
    if (command.imageLayerUpdates) {
      setImageLayers((prev) => prev.map((layer) => ({ ...layer, ...command.imageLayerUpdates!.updates })));
    }

    // Apply text overlay updates from chat
    if (command.clearTextOverlays) {
      setTextOverlays([]);
    } else if (command.textOverlayUpdates) {
      const tu = command.textOverlayUpdates;
      setTextOverlays((prev) => prev.map((o) => ({
        ...o,
        color: tu.color ?? o.color,
        style: tu.style ?? o.style,
        size: tu.size ?? o.size,
      })));
    }

    // Add assistant message
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      user_id: user!.id,
      role: 'assistant',
      content: command.response,
      applied_command: command.changes as unknown as Record<string, unknown>,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, assistantMessage]);

    // Persist to DB
    await supabase.from('chat_messages').insert([userMessage, assistantMessage]);

    // Changes are applied instantly to the live preview via the useEffect that watches styleConfig.
    // No auto-generate — the user sees changes immediately in the preview canvas.
    // They can click "Generate Video" to save a version when they're happy.
  };

  if (step === 'upload') {
    return <UploadView onUpload={handleFileUpload} error={error} />;
  }

  if (step === 'analyzing') {
    return <AnalyzingView fileName={audioName} />;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Main area */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="card overflow-hidden">
            <div className="relative bg-black aspect-video">
              <canvas ref={canvasRef} className="w-full h-full" />
              <audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />

              {/* Play overlay */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center group"
              >
                <div className={cn(
                  'w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-all',
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                )}>
                  {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
                </div>
              </button>

              {/* Render overlay */}
              <AnimatePresence>
                {isRendering && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
                  >
                    <Loader2 className="w-10 h-10 animate-spin text-primary-400 mb-4" />
                    <p className="text-white font-medium mb-2">Rendering Video…</p>
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary-500 rounded-full" animate={{ width: `${renderProgress}%` }} />
                    </div>
                    <p className="text-sm text-surface-700 mt-2">{Math.round(renderProgress)}%</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transport bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
              <button onClick={togglePlay} className="btn-secondary !p-2 shrink-0">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              {/* Seek bar */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs text-surface-700 tabular-nums shrink-0">{formatDuration(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration)}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    if (audioRef.current) audioRef.current.currentTime = t;
                    setCurrentTime(t);
                  }}
                  className="flex-1 accent-primary-500 min-w-0"
                />
                <span className="text-xs text-surface-700 tabular-nums shrink-0">{formatDuration(duration)}</span>
              </div>
              {/* Volume */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Volume2 className="w-4 h-4 text-surface-700" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  defaultValue={1}
                  onChange={(e) => { if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value); }}
                  className="w-16 accent-primary-500"
                />
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost !p-2 shrink-0">
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Analysis panel */}
          {analysis && <AnalysisPanel analysis={analysis} />}

          {/* Style picker */}
          <StylePicker selected={selectedPreset} onSelect={setSelectedPreset} />

          {/* Multi-asset uploader */}
          {currentProject && (
            <MultiAssetUploader
              projectId={currentProject.id}
              onAssetsChange={({ images, texts }) => {
                setImageLayers(images);
                setTextOverlays(texts);
              }}
            />
          )}

          {/* Character message panel */}
          <CharacterMessagePanel onMessagesChange={setCharacterMessages} />

          {/* Generate button */}
          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={isRendering} className="btn-primary flex-1 py-3">
              {isRendering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {isRendering ? 'Rendering…' : 'Generate Video'}
            </button>
            {currentProject && (
              <>
                <button onClick={() => navigate(`/project/${currentProject.id}/versions`)} className="btn-secondary py-3">
                  <History className="w-5 h-5" />
                </button>
                <button onClick={() => navigate(`/project/${currentProject.id}/timeline`)} className="btn-secondary py-3">
                  <Layers className="w-5 h-5" />
                </button>
                <button onClick={() => navigate(`/project/${currentProject.id}/export`)} className="btn-secondary py-3">
                  <Download className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Settings drawer */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel config={styleConfig} onChange={setStyleConfig} />
            )}
          </AnimatePresence>
        </div>

        {/* Chat sidebar */}
        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <ChatPanel
            messages={chatMessages}
            input={chatInput}
            setInput={setChatInput}
            onSubmit={handleChatSubmit}
            versions={versions}
          />
        </div>
      </div>
    </div>
  );
}

// --- Upload View ---
function UploadView({ onUpload, error }: { onUpload: (f: File) => void; error: string | null }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="relative inline-block mb-5">
          <div className="absolute inset-0 blur-2xl bg-primary-500/30 rounded-full" />
          <Music className="relative w-14 h-14 text-primary-400" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">Upload Your Song</h1>
        <p className="text-surface-700">AI will analyze the beat, mood, and energy — then generate cinematic visuals.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-error-500/10 border border-error-500/20 px-4 py-3 text-sm text-error-300 text-center">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('audio/')) onUpload(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'card p-12 border-2 border-dashed cursor-pointer transition-all',
          dragging ? 'border-primary-500/50 bg-primary-500/5 scale-[1.02]' : 'border-white/10 hover:border-primary-500/30'
        )}
      >
        <Upload className="w-10 h-10 text-surface-600 mx-auto mb-4" />
        <p className="text-center font-medium mb-1">Drop your audio file here</p>
        <p className="text-center text-sm text-surface-700">or click to browse — MP3, WAV, M4A, FLAC, OGG</p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </div>
    </div>
  );
}

// --- Analyzing View ---
function AnalyzingView({ fileName }: { fileName: string }) {
  const steps = ['Decoding audio', 'Detecting BPM & tempo', 'Analyzing frequency spectrum', 'Identifying beats & drops', 'Mapping song sections', 'Inferring mood & emotion'];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary-500/40 rounded-full animate-pulse-glow" />
        <Activity className="relative w-14 h-14 text-primary-400 animate-pulse" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-2">Analyzing Your Audio</h1>
      <p className="text-surface-700 mb-8 truncate">{fileName}</p>
      <div className="space-y-3 text-left">
        {steps.map((step, i) => (
          <div key={step} className={cn('flex items-center gap-3 transition-opacity', i <= currentStep ? 'opacity-100' : 'opacity-30')}>
            {i < currentStep ? (
              <div className="w-5 h-5 rounded-full bg-success-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : i === currentStep ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-surface-500" />
            )}
            <span className={cn('text-sm', i <= currentStep ? 'text-white' : 'text-surface-700')}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Analysis Panel ---
function AnalysisPanel({ analysis }: { analysis: AudioAnalysis }) {
  const spectrum = analysis.frequencySpectrum;
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" /> Audio Analysis</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="BPM" value={analysis.bpm.toString()} />
        <Metric label="Genre" value={analysis.genre} />
        <Metric label="Mood" value={analysis.mood} />
        <Metric label="Emotion" value={analysis.emotion} />
        <Metric label="Energy" value={`${Math.round(analysis.energy * 100)}%`} />
        <Metric label="Bass" value={`${Math.round(analysis.bass * 100)}%`} />
        <Metric label="Vocals" value={`${Math.round(analysis.vocals * 100)}%`} />
        <Metric label="Duration" value={formatDuration(analysis.durationSec)} />
      </div>
      {/* Spectrum bars */}
      <div className="flex items-end gap-0.5 h-16 mb-3">
        {spectrum.map((v, i) => (
          <div key={i} className="flex-1 bg-gradient-to-t from-primary-600 to-secondary-400 rounded-sm" style={{ height: `${Math.max(2, v * 100)}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="badge bg-surface-300/50 text-surface-800">{analysis.beatPositions.length} beats detected</span>
        <span className="badge bg-surface-300/50 text-surface-800">{analysis.sections.length} sections</span>
        {analysis.drops.length > 0 && <span className="badge bg-accent-500/15 text-accent-300">{analysis.drops.length} drops</span>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-200/40 rounded-lg px-3 py-2">
      <div className="text-xs text-surface-700">{label}</div>
      <div className="font-semibold text-sm truncate">{value}</div>
    </div>
  );
}

// --- Style Picker ---
function StylePicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [category, setCategory] = useState<string>('all');
  const categories = ['all', 'abstract', 'nature', 'scifi', 'fantasy', 'cinematic', 'artistic'];
  const filtered = category === 'all' ? VISUAL_PRESETS : VISUAL_PRESETS.filter((p) => p.category === category);

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-400" /> Visual Style</h3>
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'badge px-3 py-1.5 capitalize transition-colors whitespace-nowrap',
              category === cat ? 'bg-primary-500/20 text-primary-300' : 'bg-surface-200/40 text-surface-700 hover:text-white'
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              'rounded-xl p-3 text-left border transition-all',
              selected === preset.id
                ? 'border-primary-500/50 bg-primary-500/10 shadow-glow'
                : 'border-white/5 bg-surface-200/30 hover:border-white/10 hover:bg-surface-200/50'
            )}
          >
            <div className="font-medium text-sm truncate">{preset.name}</div>
            <div className="text-xs text-surface-700 truncate">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Settings Panel ---
function SettingsPanel({ config, onChange }: { config: StyleConfig; onChange: (c: StyleConfig) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="card p-5 overflow-hidden"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary-400" /> Advanced Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="label">Camera Movement</label>
          <select
            className="input"
            value={config.camera?.movement ?? 'auto'}
            onChange={(e) => onChange({ ...config, camera: { movement: e.target.value as CameraMovement, speed: config.camera?.speed ?? 0.5, shake: config.camera?.shake ?? 0 } })}
          >
            <option value="static">Static</option>
            <option value="zoom">Zoom</option>
            <option value="pan">Pan</option>
            <option value="orbit">Orbit</option>
            <option value="tracking">Tracking</option>
            <option value="dolly">Dolly</option>
            <option value="tilt">Tilt</option>
            <option value="roll">Roll</option>
            <option value="crane">Crane</option>
            <option value="parallax">Parallax</option>
          </select>
        </div>
        <Slider label="Camera Speed" value={config.camera?.speed ?? 0.5} onChange={(v) => onChange({ ...config, camera: { ...config.camera!, movement: config.camera?.movement ?? 'pan', speed: v, shake: config.camera?.shake ?? 0 } })} />
        <Slider label="Camera Shake" value={config.camera?.shake ?? 0} onChange={(v) => onChange({ ...config, camera: { ...config.camera!, movement: config.camera?.movement ?? 'tracking', speed: config.camera?.speed ?? 0.5, shake: v } })} />
        <Slider label="Particle Density" value={config.particleDensity ?? 0.5} onChange={(v) => onChange({ ...config, particleDensity: v })} />
        <Slider label="Glow Intensity" value={config.glowIntensity ?? 0.5} onChange={(v) => onChange({ ...config, glowIntensity: v })} />
        <Slider label="Beat Sync" value={config.beatSync ?? 0.5} onChange={(v) => onChange({ ...config, beatSync: v })} />
        <Slider label="Motion Speed" value={config.motionSpeed ?? 0.5} onChange={(v) => onChange({ ...config, motionSpeed: v })} />
        <div>
          <label className="label">Scene Transitions</label>
          <select className="input" value={config.sceneTransitions ?? 'crossfade'} onChange={(e) => onChange({ ...config, sceneTransitions: e.target.value as StyleConfig['sceneTransitions'] })}>
            <option value="cut">Cut</option>
            <option value="crossfade">Crossfade</option>
            <option value="whip">Whip Pan</option>
            <option value="zoom">Zoom Transition</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="label !mb-0">{label}</label>
        <span className="text-sm text-surface-700">{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(clamp(parseFloat(e.target.value), 0, 1))} className="w-full accent-primary-500" />
    </div>
  );
}

// --- Chat Panel ---
function ChatPanel({ messages, input, setInput, onSubmit, versions }: {
  messages: ChatMessage[];
  input: string;
  setInput: (s: string) => void;
  onSubmit: () => void;
  versions: Version[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const suggestions = ['Make it darker', 'Use Galaxy Flow', 'Add fire', 'Make it cinematic', 'Slower camera', 'Add particles', 'Use Cyberpunk', 'Add a boy character', 'Animate text', 'Add lightning', 'Make it trending style', 'Move image left', 'Make image bigger', 'Image beat sync', 'Text color blue', 'Add neon frame', 'Make text glitch'];

  return (
    <div className="card flex flex-col h-full max-h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-2 p-4 border-b border-white/5">
        <MessageSquare className="w-4 h-4 text-primary-400" />
        <h3 className="font-semibold text-sm">AI Video Assistant</h3>
        <span className="badge bg-success-500/15 text-success-300 ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" /> Live
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <p className="text-sm text-surface-700 mb-4">Tell me how to adjust your video. I'll regenerate without re-uploading.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="badge bg-surface-200/50 text-surface-800 hover:bg-primary-500/15 hover:text-primary-300 transition-colors cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-surface-200/60 text-surface-900'
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {versions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-surface-700 shrink-0">{versions.length} versions</span>
          {versions.slice(0, 5).map((v) => (
            <span key={v.id} className="badge bg-surface-200/40 text-surface-800 text-xs shrink-0">{v.label}</span>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
            placeholder="e.g. make it darker, add fire…"
            className="input text-sm"
          />
          <button onClick={onSubmit} className="btn-primary !px-3">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
