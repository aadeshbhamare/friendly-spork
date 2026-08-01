import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, File, Loader2, Plus, Trash2, Type, ChevronDown, ChevronUp, Clock, Maximize2, Sparkles, Film, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractTextFromFile, textToOverlays } from '@/lib/textExtractor';
import { cn } from '@/lib/utils';
import type { Asset, AssetType, TextOverlay, ImageLayer, ImageSizePreset, ImageAnimationSpeed } from '@/types';

interface UploadedAsset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  size_kb: number;
  extractedText?: string;
  preview?: string;
}

interface MultiAssetUploaderProps {
  projectId: string;
  onAssetsChange: (assets: { images: ImageLayer[]; texts: TextOverlay[]; allAssets: UploadedAsset[] }) => void;
}

const ACCEPTED_TYPES = 'image/*,text/*,.csv,.json,.xml,.html,.svg,.md,.txt,.xlsx,.xls,.ods,.docx,.doc,.odt,.rtf,.pdf,.pptx,.ppt,.tsv,.log,.mp4,.webm,.mov,.gif';

const SIZE_PRESETS: Record<ImageSizePreset, number> = {
  small: 0.15,
  medium: 0.3,
  large: 0.55,
  custom: 0.3,
};

const ANIMATIONS = [
  { id: 'float', label: 'Float' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'rotate', label: 'Rotate' },
  { id: 'slide', label: 'Slide' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'shake', label: 'Shake' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'fade', label: 'Fade' },
  { id: 'static', label: 'Static' },
] as const;

const SPEEDS: { id: ImageAnimationSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
  { id: 'beat', label: 'Beat Sync' },
];

const FRAME_STYLES = [
  { id: 'none', label: 'No Frame' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'neon', label: 'Neon' },
  { id: 'glow', label: 'Glow' },
  { id: 'film', label: 'Film' },
] as const;

const TRANSITIONS_IN = [
  { id: 'fade', label: 'Fade In' },
  { id: 'slide-left', label: 'Slide from Left' },
  { id: 'slide-right', label: 'Slide from Right' },
  { id: 'zoom', label: 'Zoom In' },
  { id: 'bounce', label: 'Bounce In' },
  { id: 'flip', label: 'Flip' },
  { id: 'cut', label: 'Cut' },
] as const;

export function MultiAssetUploader({ projectId, onAssetsChange }: MultiAssetUploaderProps) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categorizeFile = (file: File): AssetType => {
    const name = file.name.toLowerCase();
    const type = file.type;
    if (type.startsWith('image/')) return type === 'image/gif' ? 'gif' : 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('text/') || /\.(txt|md|json|xml|html|svg|log|csv|tsv)$/i.test(name)) return 'text';
    if (type.includes('spreadsheet') || /\.(xlsx|xls|ods|csv)$/i.test(name)) return 'spreadsheet';
    if (type.includes('word') || type.includes('document') || /\.(docx|doc|odt|rtf)$/i.test(name)) return 'document';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'document';
    if (type.includes('presentation') || /\.(pptx|ppt)$/i.test(name)) return 'document';
    return 'text';
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const fileArray = Array.from(files);
    const newAssets: UploadedAsset[] = [];
    const newImageLayers: ImageLayer[] = [];

    let imageIndex = imageLayers.length;

    for (const file of fileArray) {
      const type = categorizeFile(file);
      let url = '';
      let extractedText: string | undefined;
      let preview: string | undefined;

      const filePath = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('audio').upload(filePath, file, { upsert: false });

      if (uploadError) {
        url = URL.createObjectURL(file);
      } else {
        const { data: urlData } = supabase.storage.from('audio').getPublicUrl(filePath);
        url = urlData.publicUrl;
      }

      if (type === 'image' || type === 'gif') {
        preview = url;
        // Create image layer with user-controllable defaults
        const layer: ImageLayer = {
          url,
          name: file.name,
          start: imageIndex * 5,
          duration: 10,
          x: (imageIndex % 3 - 1) * 0.3,
          y: (Math.floor(imageIndex / 3) - 0.5) * 0.3,
          scale: SIZE_PRESETS.medium,
          sizePreset: 'medium',
          opacity: 0.85,
          animation: 'float',
          animationSpeed: 'normal',
          beatSync: false,
          frameMode: false,
          frameStyle: 'none',
          transitionIn: 'fade',
          transitionOut: 'fade',
        };
        newImageLayers.push(layer);
        imageIndex++;
      }

      if (type === 'text' || type === 'document' || type === 'spreadsheet') {
        try {
          extractedText = await extractTextFromFile(file);
        } catch { /* ignore */ }
      }

      const asset: UploadedAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        url,
        size_kb: file.size / 1024,
        extractedText,
        preview,
      };
      newAssets.push(asset);

      await supabase.from('assets').insert({
        project_id: projectId,
        type,
        name: file.name,
        url,
        mime_type: file.type,
        size_kb: file.size / 1024,
      });
    }

    const updatedAssets = [...assets, ...newAssets];
    const updatedImages = [...imageLayers, ...newImageLayers];
    setAssets(updatedAssets);
    setImageLayers(updatedImages);
    setUploading(false);
    notifyParent(updatedAssets, updatedImages);
  }, [assets, imageLayers, projectId]);

  const removeAsset = (id: string, url: string) => {
    const updatedAssets = assets.filter((a) => a.id !== id);
    const updatedImages = imageLayers.filter((l) => l.url !== url);
    setAssets(updatedAssets);
    setImageLayers(updatedImages);
    notifyParent(updatedAssets, updatedImages);
  };

  const updateImageLayer = (index: number, updates: Partial<ImageLayer>) => {
    const updated = imageLayers.map((l, i) => i === index ? { ...l, ...updates } : l);
    setImageLayers(updated);
    notifyParent(assets, updated);
  };

  const notifyParent = (allAssets: UploadedAsset[], images: ImageLayer[]) => {
    const texts: TextOverlay[] = [];
    allAssets
      .filter((a) => (a.type === 'text' || a.type === 'document' || a.type === 'spreadsheet') && a.extractedText)
      .forEach((a) => {
        const overlays = textToOverlays(a.extractedText!, 4);
        texts.push(...overlays.map((o) => ({ ...o, style: 'kinetic' as const, color: '#ffffff', size: 1 })));
      });
    onAssetsChange({ images, texts, allAssets });
  };

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary-400" /> Upload Assets for Animation
      </h3>
      <p className="text-xs text-surface-700 mb-3">
        Upload images, documents, spreadsheets, text, or video. Control when each image appears, its size, animation, and timing.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all text-center',
          dragging ? 'border-primary-500/50 bg-primary-500/5' : 'border-white/10 hover:border-primary-500/30'
        )}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-surface-700">
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" /> Processing files…
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-surface-600 mx-auto mb-2" />
            <p className="text-sm font-medium mb-0.5">Drop any files here</p>
            <p className="text-xs text-surface-700">Images, Excel, Word, PDF, text, CSV, video — multiple files OK</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        />
      </div>

      {/* Image layers with per-image controls */}
      {imageLayers.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-surface-700 font-medium flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> {imageLayers.length} image(s) — tap to customize animation
          </div>
          {imageLayers.map((layer, i) => (
            <ImageLayerCard
              key={i}
              layer={layer}
              expanded={expandedId === `img-${i}`}
              onToggle={() => setExpandedId(expandedId === `img-${i}` ? null : `img-${i}`)}
              onUpdate={(updates) => updateImageLayer(i, updates)}
              onRemove={() => removeAsset(assets.find((a) => a.url === layer.url)?.id ?? '', layer.url)}
            />
          ))}
        </div>
      )}

      {/* Non-image assets */}
      <AnimatePresence>
        {assets.filter((a) => a.type !== 'image' && a.type !== 'gif').length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            <div className="text-xs text-surface-700 font-medium">Documents & Text</div>
            {assets.filter((a) => a.type !== 'image' && a.type !== 'gif').map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 bg-surface-200/40 rounded-lg p-2 group">
                <AssetIcon type={asset.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{asset.name}</div>
                  <div className="text-xs text-surface-700">
                    {asset.type} · {asset.size_kb < 1024 ? `${asset.size_kb.toFixed(0)} KB` : `${(asset.size_kb / 1024).toFixed(1)} MB`}
                    {asset.extractedText && ` · ${asset.extractedText.length} chars`}
                  </div>
                </div>
                <button onClick={() => removeAsset(asset.id, asset.url)} className="opacity-0 group-hover:opacity-100 btn-ghost !p-1.5 text-error-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageLayerCard({ layer, expanded, onToggle, onUpdate, onRemove }: {
  layer: ImageLayer;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<ImageLayer>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-surface-200/40 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2.5 p-2.5 group">
        {layer.url ? (
          <img src={layer.url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface-300/50 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-surface-700" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{layer.name}</div>
          <div className="text-xs text-surface-700">
            {layer.sizePreset} · {layer.animation} · {layer.animationSpeed}
            {layer.beatSync && ' · beat-sync'}
            {layer.frameMode && ' · framed'}
          </div>
        </div>
        <button onClick={onToggle} className="btn-ghost !p-1.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onRemove} className="btn-ghost !p-1.5 text-error-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded controls */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/5 px-3 pb-3 pt-2 space-y-3"
          >
            {/* Timing */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-surface-700 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Start (sec)</label>
                <input
                  type="number"
                  className="input text-sm py-1.5"
                  value={layer.start}
                  min={0}
                  step={0.5}
                  onChange={(e) => onUpdate({ start: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-surface-700 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Duration (sec)</label>
                <input
                  type="number"
                  className="input text-sm py-1.5"
                  value={layer.duration}
                  min={1}
                  step={0.5}
                  onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) || 5 })}
                />
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-xs text-surface-700 flex items-center gap-1 mb-1.5"><Maximize2 className="w-3 h-3" /> Size</label>
              <div className="flex gap-1.5 mb-2">
                {(['small', 'medium', 'large', 'custom'] as ImageSizePreset[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdate({ sizePreset: s, scale: SIZE_PRESETS[s] })}
                    className={cn(
                      'badge px-2.5 py-1 text-xs capitalize transition-colors',
                      layer.sizePreset === s ? 'bg-primary-500/20 text-primary-300' : 'bg-surface-300/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {layer.sizePreset === 'custom' && (
                <input
                  type="range"
                  min={0.05}
                  max={1.5}
                  step={0.05}
                  value={layer.scale ?? 0.3}
                  onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-primary-500"
                />
              )}
            </div>

            {/* Animation */}
            <div>
              <label className="text-xs text-surface-700 flex items-center gap-1 mb-1.5"><Sparkles className="w-3 h-3" /> Animation</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ANIMATIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onUpdate({ animation: a.id })}
                    className={cn(
                      'badge px-2.5 py-1 text-xs transition-colors',
                      layer.animation === a.id ? 'bg-primary-500/20 text-primary-300' : 'bg-surface-300/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {/* Animation speed */}
              <label className="text-xs text-surface-700 mb-1 block">Animation Speed</label>
              <div className="flex gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onUpdate({ animationSpeed: s.id, beatSync: s.id === 'beat' })}
                    className={cn(
                      'badge px-2.5 py-1 text-xs transition-colors',
                      layer.animationSpeed === s.id ? 'bg-accent-500/20 text-accent-300' : 'bg-surface-300/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {s.id === 'beat' && <Zap className="w-3 h-3" />} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame mode */}
            <div>
              <label className="text-xs text-surface-700 flex items-center gap-1 mb-1.5"><Film className="w-3 h-3" /> Frame Style</label>
              <div className="flex flex-wrap gap-1.5">
                {FRAME_STYLES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdate({ frameStyle: f.id, frameMode: f.id !== 'none' })}
                    className={cn(
                      'badge px-2.5 py-1 text-xs transition-colors',
                      (layer.frameStyle ?? 'none') === f.id ? 'bg-primary-500/20 text-primary-300' : 'bg-surface-300/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transitions */}
            <div>
              <label className="text-xs text-surface-700 mb-1 block">Enter Transition</label>
              <select
                className="input text-sm py-1.5"
                value={layer.transitionIn ?? 'fade'}
                onChange={(e) => onUpdate({ transitionIn: e.target.value as ImageLayer['transitionIn'] })}
              >
                {TRANSITIONS_IN.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs text-surface-700 mb-1 block">Opacity: {Math.round((layer.opacity ?? 0.85) * 100)}%</label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={layer.opacity ?? 0.85}
                onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-primary-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssetIcon({ type }: { type: AssetType }) {
  const icons: Record<string, typeof FileText> = {
    image: ImageIcon,
    gif: ImageIcon,
    video: File,
    text: Type,
    document: FileText,
    spreadsheet: FileSpreadsheet,
  };
  const Icon = icons[type] ?? File;
  return (
    <div className="w-10 h-10 rounded-lg bg-surface-300/50 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-surface-700" />
    </div>
  );
}
