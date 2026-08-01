import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Video, Heart, FolderOpen, HardDrive, Sparkles, Loader2, Film, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/auth/AuthContext';
import { formatDuration, timeAgo, cn } from '@/lib/utils';
import type { Project, RenderJob } from '@/types';

export function DashboardPage() {
  const { user } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
    enabled: !!user,
  });

  const { data: jobs } = useQuery({
    queryKey: ['render_jobs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('render_jobs')
        .select('*')
        .in('status', ['queued', 'processing', 'rendering'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RenderJob[];
    },
    enabled: !!user,
  });

  const favorites = projects?.filter((p) => p.favorite) ?? [];
  const storagePct = profile ? Math.min(100, (profile.storage_used_mb / 5120) * 100) : 0;

  async function deleteProject(id: string) {
    await supabase.from('projects').delete().eq('id', id);
    setMenuOpen(null);
    window.location.reload();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Welcome back, {profile?.display_name || 'Creator'}
          </h1>
          <p className="text-surface-700 mt-1">Manage your music video projects</p>
        </div>
        <button onClick={() => navigate('/studio')} className="btn-primary">
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Video} label="Total Projects" value={projects?.length ?? 0} color="primary" />
        <StatCard icon={Sparkles} label="Credits Left" value={profile?.credits ?? 0} color="accent" />
        <StatCard icon={Heart} label="Favorites" value={favorites.length} color="error" />
        <StatCard icon={HardDrive} label="Storage" value={`${(profile?.storage_used_mb ?? 0).toFixed(0)} MB`} sub={`${storagePct.toFixed(0)}% used`} color="secondary" />
      </div>

      {/* Active Renders */}
      {jobs && jobs.length > 0 && (
        <div className="card p-5 mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-primary-400" /> Rendering Queue</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-800">{job.resolution} · {job.format.toUpperCase()} · {job.aspect_ratio}</span>
                    <span className="text-surface-700">{job.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-300 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-primary-500 rounded-full" animate={{ width: `${job.progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
                <span className="badge bg-primary-500/15 text-primary-300 capitalize">{job.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold">Recent Projects</h2>
        {projects && projects.length > 0 && (
          <span className="text-sm text-surface-700">{projects.length} total</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card overflow-hidden group hover:border-primary-500/20 transition-colors"
            >
              <Link to={`/studio/${project.id}`} className="block">
                <div className="aspect-video bg-surface-200/50 relative overflow-hidden">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/10 to-secondary-500/10">
                      <Film className="w-10 h-10 text-surface-600" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 badge bg-black/60 text-white text-xs">{formatDuration(Number(project.duration_sec))}</div>
                  {project.favorite && <div className="absolute top-2 right-2"><Heart className="w-4 h-4 text-error-400 fill-error-400" /></div>}
                </div>
                <div className="p-4">
                  <h3 className="font-medium truncate">{project.title}</h3>
                  <p className="text-xs text-surface-700 mt-1">{timeAgo(project.created_at)}</p>
                </div>
              </Link>
              <div className="px-4 pb-3 flex items-center gap-2">
                <Link to={`/project/${project.id}/versions`} className="btn-ghost text-xs flex-1">Versions</Link>
                <Link to={`/project/${project.id}/timeline`} className="btn-ghost text-xs flex-1">Timeline</Link>
                <Link to={`/project/${project.id}/export`} className="btn-ghost text-xs flex-1">Export</Link>
                <div className="relative">
                  <button onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)} className="p-2 rounded-lg hover:bg-white/5">
                    <MoreVertical className="w-4 h-4 text-surface-700" />
                  </button>
                  {menuOpen === project.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 bottom-full mb-2 w-40 glass-strong rounded-xl border border-white/10 shadow-xl z-50 p-1.5">
                        <button onClick={() => deleteProject(project.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error-400 hover:bg-error-500/10">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No projects yet</h3>
          <p className="text-surface-700 mb-5">Upload a song to create your first AI music video.</p>
          <button onClick={() => navigate('/studio')} className="btn-primary">
            <Plus className="w-5 h-5" /> Create Your First Video
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Video; label: string; value: string | number; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500/10 text-primary-400',
    secondary: 'bg-secondary-500/10 text-secondary-400',
    accent: 'bg-accent-500/10 text-accent-400',
    error: 'bg-error-500/10 text-error-400',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-surface-700">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorMap[color] ?? colorMap.primary)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
      {sub && <div className="text-xs text-surface-700 mt-0.5">{sub}</div>}
    </div>
  );
}
