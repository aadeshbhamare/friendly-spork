import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Plus, Trash2, Layers, Camera, Sparkles, Type, Image as ImageIcon, Music, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VisualRenderer } from '@/lib/visualRenderer';
import { formatDuration, cn } from '@/lib/utils';
import type { Project, Version, AudioAnalysis } from '@/types';

interface TimelineLayer {
  id: string;
  name: string;
  type: 'scene' | 'camera' | 'effect' | 'text' | 'image' | 'audio';
  start: number;
  duration: number;
  color: string;
}

export function TimelineEditorPage() {
  const { projectId } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rendererRef = useRef<VisualRenderer | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [layers, setLayers] = useState<TimelineLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: pData } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      setProject(pData as Project | null);
      const { data: vData } = await supabase.from('versions').select('*').eq('project_id', projectId).order('version_number', { ascending: false });
      setVersions((vData ?? []) as Version[]);
      setLoading(false);

      // Initialize layers from analysis
      const analysis = (pData as Project)?.analysis as AudioAnalysis | undefined;
      if (analysis) {
        const sceneLayers: TimelineLayer[] = analysis.sections.map((s, i) => ({
          id: `scene-${i}`,
          name: s.label,
          type: 'scene',
          start: s.start,
          duration: s.end - s.start,
          color: '#3b82f6',
        }));
        const cameraLayers: TimelineLayer[] = [
          { id: 'cam-1', name: 'Dolly In', type: 'camera', start: 0, duration: analysis.durationSec * 0.3, color: '#06b6d4' },
          { id: 'cam-2', name: 'Orbit', type: 'camera', start: analysis.durationSec * 0.3, duration: analysis.durationSec * 0.4, color: '#06b6d4' },
          { id: 'cam-3', name: 'Zoom Out', type: 'camera', start: analysis.durationSec * 0.7, duration: analysis.durationSec * 0.3, color: '#06b6d4' },
        ];
        const effectLayers: TimelineLayer[] = analysis.drops.map((d, i) => ({
          id: `fx-${i}`,
          name: `Drop ${i + 1}`,
          type: 'effect',
          start: d,
          duration: 2,
          color: '#f59e0b',
        }));
        setLayers([...sceneLayers, ...cameraLayers, ...effectLayers]);
      }
    })();
  }, [projectId]);

  useEffect(() => {
    if (loading || !project || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 1280; canvas.height = 720;
    const renderer = new VisualRenderer(canvas);
    rendererRef.current = renderer;
    const analysis = project.analysis as AudioAnalysis;
    if (analysis) renderer.setAudioAnalysis(analysis);
    const latestVersion = versions[0];
    if (latestVersion) {
      renderer.setPreset(latestVersion.style_preset);
      renderer.setStyleConfig(latestVersion.style_config);
    }
    if (audioRef.current) renderer.attachAudio(audioRef.current);
    renderer.start();
    return () => renderer.destroy();
  }, [loading, project, versions]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, []);

  const duration = Number(project?.duration_sec) || 180;
  const playheadPct = (currentTime / duration) * 100;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }

  function addLayer(type: TimelineLayer['type']) {
    const colors: Record<string, string> = { scene: '#3b82f6', camera: '#06b6d4', effect: '#f59e0b', text: '#22c55e', image: '#ef4444', audio: '#8338ec' };
    setLayers((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: `New ${type}`,
      type,
      start: currentTime,
      duration: 5,
      color: colors[type],
    }]);
  }

  function deleteLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayer === id) setSelectedLayer(null);
  }

  function updateLayer(id: string, updates: Partial<TimelineLayer>) {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  const layerIcons: Record<string, typeof Layers> = { scene: Layers, camera: Camera, effect: Sparkles, text: Type, image: ImageIcon, audio: Music };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      <Link to={`/studio/${projectId}`} className="btn-ghost text-sm mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Studio
      </Link>

      <h1 className="font-display text-2xl font-bold mb-4">Timeline Editor</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* Preview + Timeline */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="card overflow-hidden">
            <div className="relative bg-black aspect-video">
              <canvas ref={canvasRef} className="w-full h-full" />
              <audio ref={audioRef} src={project?.audio_url ?? ''} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center group">
                <div className={cn('w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center', isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100')}>
                  {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                </div>
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-4">
            {/* Ruler */}
            <div className="flex items-center gap-3 mb-3">
              <button onClick={togglePlay} className="btn-secondary !p-2">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-sm font-mono text-surface-700">{formatDuration(currentTime)} / {formatDuration(duration)}</span>
            </div>

            <div className="relative">
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-primary-400 z-20 pointer-events-none" style={{ left: `${playheadPct}%` }}>
                <div className="w-3 h-3 bg-primary-400 rounded-full -ml-1.5 -mt-1" />
              </div>

              {/* Time ruler */}
              <div className="h-6 flex border-b border-white/5 mb-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex-1 border-r border-white/5 text-xs text-surface-700 pl-1">
                    {formatDuration((duration / 10) * i)}
                  </div>
                ))}
              </div>

              {/* Layers */}
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {layers.map((layer) => {
                  const Icon = layerIcons[layer.type];
                  const left = (layer.start / duration) * 100;
                  const width = (layer.duration / duration) * 100;
                  return (
                    <div key={layer.id} className="flex items-center gap-2 group">
                      <div className="w-24 shrink-0 flex items-center gap-1.5 text-xs text-surface-700 truncate">
                        <Icon className="w-3 h-3" style={{ color: layer.color }} />
                        <span className="truncate">{layer.name}</span>
                      </div>
                      <div className="flex-1 relative h-8 bg-surface-200/30 rounded">
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          onDragEnd={(_, info) => {
                            const deltaSec = (info.offset.x / (canvasRef.current?.clientWidth ?? 1)) * duration;
                            updateLayer(layer.id, { start: Math.max(0, layer.start + deltaSec) });
                          }}
                          onClick={() => setSelectedLayer(layer.id)}
                          className={cn(
                            'absolute h-full rounded-md flex items-center px-2 text-xs text-white cursor-pointer transition-shadow',
                            selectedLayer === layer.id && 'ring-2 ring-white/30'
                          )}
                          style={{ left: `${left}%`, width: `${Math.max(2, width)}%`, backgroundColor: layer.color }}
                        >
                          <span className="truncate">{layer.name}</span>
                        </motion.div>
                      </div>
                      <button onClick={() => deleteLayer(layer.id)} className="opacity-0 group-hover:opacity-100 btn-ghost !p-1 text-error-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Layer panel */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-400" /> Add Layer</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['scene', 'camera', 'effect', 'text', 'image', 'audio'] as const).map((type) => {
                const Icon = layerIcons[type];
                return (
                  <button key={type} onClick={() => addLayer(type)} className="btn-secondary text-xs capitalize">
                    <Icon className="w-3.5 h-3.5" /> {type}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedLayer && (() => {
            const layer = layers.find((l) => l.id === selectedLayer);
            if (!layer) return null;
            return (
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3">Layer Properties</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Name</label>
                    <input className="input text-sm" value={layer.name} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Start (s)</label>
                    <input type="number" className="input text-sm" value={layer.start.toFixed(1)} onChange={(e) => updateLayer(layer.id, { start: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="label">Duration (s)</label>
                    <input type="number" className="input text-sm" value={layer.duration.toFixed(1)} onChange={(e) => updateLayer(layer.id, { duration: parseFloat(e.target.value) || 1 })} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
