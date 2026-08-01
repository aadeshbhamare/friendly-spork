import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Copy, Trash2, Edit2, Check, X, Loader2, GitCompare, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { timeAgo, cn } from '@/lib/utils';
import { getPresetById } from '@/lib/visualPresets';
import type { Version, Project } from '@/types';

export function VersionHistoryPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<Version[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: pData } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      setProject(pData as Project | null);
      const { data: vData } = await supabase.from('versions').select('*').eq('project_id', projectId).order('version_number', { ascending: false });
      setVersions((vData ?? []) as Version[]);
      setLoading(false);
    })();
  }, [projectId]);

  async function toggleFavorite(v: Version) {
    const newVal = !v.favorite;
    await supabase.from('versions').update({ favorite: newVal }).eq('id', v.id);
    setVersions((prev) => prev.map((x) => x.id === v.id ? { ...x, favorite: newVal } : x));
  }

  async function duplicate(v: Version) {
    const newNum = Math.max(...versions.map((x) => x.version_number)) + 1;
    const { data } = await supabase.from('versions').insert({
      project_id: v.project_id,
      version_number: newNum,
      label: `${v.label} (copy)`,
      style_preset: v.style_preset,
      style_config: v.style_config,
      status: 'ready',
    }).select().single();
    if (data) setVersions((prev) => [data as Version, ...prev]);
  }

  async function deleteVersion(v: Version) {
    await supabase.from('versions').delete().eq('id', v.id);
    setVersions((prev) => prev.filter((x) => x.id !== v.id));
  }

  async function saveLabel(v: Version) {
    await supabase.from('versions').update({ label: editLabel }).eq('id', v.id);
    setVersions((prev) => prev.map((x) => x.id === v.id ? { ...x, label: editLabel } : x));
    setEditingId(null);
  }

  async function restore(v: Version) {
    // Navigate to studio with this version's settings
    navigate(`/studio/${projectId}`);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to={`/studio/${projectId}`} className="btn-ghost text-sm mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Studio
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Version History</h1>
          <p className="text-surface-700 mt-1">{project?.title ?? 'Project'} — {versions.length} versions</p>
        </div>
        {versions.length >= 2 && (
          <button
            onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
            className={cn('btn text-sm', compareMode ? 'btn-primary' : 'btn-secondary')}
          >
            <GitCompare className="w-4 h-4" /> {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
        )}
      </div>

      {compareMode && (
        <div className="card p-3 mb-4 text-sm text-surface-700">
          Select 2 versions to compare side by side. ({selected.length}/2 selected)
          {selected.length === 2 && (
            <button onClick={() => navigate(`/studio/${projectId}`)} className="btn-primary text-xs ml-3">View Comparison</button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {versions.map((v, i) => {
          const preset = getPresetById(v.style_preset);
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'card p-4 flex items-center gap-4',
                compareMode && selected.includes(v.id) && 'border-primary-500/50 shadow-glow'
              )}
            >
              {compareMode && (
                <button
                  onClick={() => {
                    setSelected((prev) =>
                      prev.includes(v.id) ? prev.filter((x) => x !== v.id)
                      : prev.length < 2 ? [...prev, v.id] : prev
                    );
                  }}
                  className="w-5 h-5 rounded border-2 border-surface-500 flex items-center justify-center"
                >
                  {selected.includes(v.id) && <Check className="w-3 h-3 text-primary-400" />}
                </button>
              )}

              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-lg text-primary-300">v{v.version_number}</span>
              </div>

              <div className="flex-1 min-w-0">
                {editingId === v.id ? (
                  <div className="flex items-center gap-2">
                    <input className="input text-sm py-1.5" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} autoFocus />
                    <button onClick={() => saveLabel(v)} className="btn-ghost !p-1.5"><Check className="w-4 h-4 text-success-400" /></button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost !p-1.5"><X className="w-4 h-4 text-surface-700" /></button>
                  </div>
                ) : (
                  <h3 className="font-medium truncate">{v.label}</h3>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="badge bg-surface-200/40 text-surface-800 text-xs">{preset?.name ?? v.style_preset}</span>
                  <span className={cn(
                    'badge text-xs capitalize',
                    v.status === 'ready' ? 'bg-success-500/15 text-success-300' :
                    v.status === 'rendering' ? 'bg-primary-500/15 text-primary-300' :
                    v.status === 'failed' ? 'bg-error-500/15 text-error-300' :
                    'bg-surface-300/40 text-surface-700'
                  )}>{v.status}</span>
                  <span className="text-xs text-surface-700">{timeAgo(v.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleFavorite(v)} className="btn-ghost !p-2" title="Favorite">
                  {v.favorite ? <Star className="w-4 h-4 text-accent-400 fill-accent-400" /> : <Heart className="w-4 h-4" />}
                </button>
                <button onClick={() => restore(v)} className="btn-ghost !p-2 text-xs" title="Restore">Restore</button>
                <button onClick={() => duplicate(v)} className="btn-ghost !p-2" title="Duplicate"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { setEditingId(v.id); setEditLabel(v.label); }} className="btn-ghost !p-2" title="Rename"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteVersion(v)} className="btn-ghost !p-2 text-error-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {versions.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-surface-700">No versions yet. Generate a video in the studio to create your first version.</p>
          <Link to={`/studio/${projectId}`} className="btn-primary mt-4 inline-flex">Go to Studio</Link>
        </div>
      )}
    </div>
  );
}
