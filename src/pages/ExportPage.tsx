import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Loader2, Check, Film, Monitor, Smartphone, Square, Instagram, Youtube, Music2, Facebook } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const FORMATS = [
  { id: 'mp4', name: 'MP4', desc: 'Best for web & social' },
  { id: 'mov', name: 'MOV', desc: 'High quality, Apple' },
  { id: 'webm', name: 'WebM', desc: 'Open format, small' },
  { id: 'gif', name: 'GIF', desc: 'Looping animation' },
];

const RESOLUTIONS = [
  { id: '720p', name: '720p', desc: '1280 × 720' },
  { id: '1080p', name: '1080p', desc: '1920 × 1080' },
  { id: '1440p', name: '1440p', desc: '2560 × 1440' },
  { id: '4k', name: '4K', desc: '3840 × 2160' },
  { id: '8k', name: '8K', desc: '7680 × 4320', pro: true },
];

const FPS_OPTIONS = [
  { id: 30, name: '30 FPS' },
  { id: 60, name: '60 FPS' },
  { id: 120, name: '120 FPS', pro: true },
];

const ASPECT_RATIOS = [
  { id: '16:9', name: '16:9', icon: Monitor, desc: 'YouTube' },
  { id: '9:16', name: '9:16', icon: Smartphone, desc: 'TikTok / Reels' },
  { id: '1:1', name: '1:1', icon: Square, desc: 'Instagram Post' },
  { id: '4:5', name: '4:5', icon: Smartphone, desc: 'Instagram Feed' },
];

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, ratio: '16:9' },
  { id: 'instagram', name: 'Instagram Reel', icon: Instagram, ratio: '9:16' },
  { id: 'tiktok', name: 'TikTok', icon: Smartphone, ratio: '9:16' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, ratio: '16:9' },
  { id: 'spotify', name: 'Spotify Canvas', icon: Music2, ratio: '1:1' },
];

export function ExportPage() {
  const { projectId } = useParams();
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  async function handleExport() {
    setExporting(true);
    setProgress(0);
    setDone(false);

    // Create render job
    await supabase.from('render_jobs').insert({
      version_id: projectId,
      format,
      resolution,
      aspect_ratio: aspectRatio,
      fps,
      status: 'processing',
    });

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 10;
        if (next >= 100) {
          clearInterval(interval);
          setExporting(false);
          setDone(true);
          return 100;
        }
        return next;
      });
    }, 300);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to={`/studio/${projectId}`} className="btn-ghost text-sm mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Studio
      </Link>

      <h1 className="font-display text-2xl font-bold mb-6">Export Video</h1>

      <div className="space-y-5">
        {/* Platform presets */}
        <Section title="Quick Presets">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setAspectRatio(p.ratio)}
                className="card p-4 text-center hover:border-primary-500/20 transition-colors"
              >
                <p.icon className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-surface-700">{p.ratio}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Format */}
        <Section title="Format">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FORMATS.map((f) => (
              <OptionCard key={f.id} selected={format === f.id} onClick={() => setFormat(f.id)} title={f.name} desc={f.desc} />
            ))}
          </div>
        </Section>

        {/* Resolution */}
        <Section title="Resolution">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {RESOLUTIONS.map((r) => (
              <OptionCard key={r.id} selected={resolution === r.id} onClick={() => setResolution(r.id)} title={r.name} desc={r.desc} pro={r.pro} />
            ))}
          </div>
        </Section>

        {/* FPS */}
        <Section title="Frame Rate">
          <div className="grid grid-cols-3 gap-3">
            {FPS_OPTIONS.map((f) => (
              <OptionCard key={f.id} selected={fps === f.id} onClick={() => setFps(f.id)} title={f.name} pro={f.pro} />
            ))}
          </div>
        </Section>

        {/* Aspect Ratio */}
        <Section title="Aspect Ratio">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setAspectRatio(r.id)}
                className={cn(
                  'card p-4 flex flex-col items-center gap-2 transition-colors',
                  aspectRatio === r.id && 'border-primary-500/50 shadow-glow'
                )}
              >
                <r.icon className={cn('w-6 h-6', aspectRatio === r.id ? 'text-primary-400' : 'text-surface-700')} />
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-surface-700">{r.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Export button */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">Export Summary</div>
              <div className="text-sm text-surface-700">{format.toUpperCase()} · {resolution} · {fps} FPS · {aspectRatio}</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-xl bg-success-500/10 border border-success-500/20 px-4 py-3"
              >
                <Check className="w-5 h-5 text-success-400" />
                <span className="text-sm text-success-300">Export complete! Your video is ready to download.</span>
                <button className="btn-primary ml-auto text-sm">
                  <Download className="w-4 h-4" /> Download
                </button>
              </motion.div>
            ) : exporting ? (
              <motion.div key="exporting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                  <span className="text-sm">Exporting video…</span>
                  <span className="text-sm text-surface-700 ml-auto">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-surface-300 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary-500 rounded-full" animate={{ width: `${progress}%` }} />
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="export"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleExport}
                className="btn-primary w-full py-3"
              >
                <Download className="w-5 h-5" /> Start Export
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-sm mb-3">{title}</h2>
      {children}
    </div>
  );
}

function OptionCard({ selected, onClick, title, desc, pro }: { selected: boolean; onClick: () => void; title: string; desc?: string; pro?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'card p-3 text-left transition-colors relative',
        selected ? 'border-primary-500/50 shadow-glow' : 'hover:border-white/10'
      )}
    >
      {pro && <span className="badge bg-accent-500/15 text-accent-300 text-xs absolute top-2 right-2">PRO</span>}
      <div className="font-medium text-sm">{title}</div>
      {desc && <div className="text-xs text-surface-700 mt-0.5">{desc}</div>}
      {selected && <Check className="w-4 h-4 text-primary-400 absolute bottom-2 right-2" />}
    </button>
  );
}
