import { useQuery } from '@tanstack/react-query';
import { Users, HardDrive, Cpu, DollarSign, Activity, Server, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function AdminPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [users, projects, versions, jobs] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('versions').select('*', { count: 'exact', head: true }),
        supabase.from('render_jobs').select('*', { count: 'exact', head: true }),
      ]);
      return {
        users: users.count ?? 0,
        projects: projects.count ?? 0,
        versions: versions.count ?? 0,
        jobs: jobs.count ?? 0,
      };
    },
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: async () => {
      const { data } = await supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Admin Panel</h1>
        <p className="text-surface-700 mt-1">System overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStat icon={Users} label="Total Users" value={stats?.users ?? 0} color="primary" loading={isLoading} />
        <AdminStat icon={Activity} label="Total Projects" value={stats?.projects ?? 0} color="secondary" loading={isLoading} />
        <AdminStat icon={Cpu} label="Total Renders" value={stats?.versions ?? 0} color="accent" loading={isLoading} />
        <AdminStat icon={Server} label="Active Jobs" value={stats?.jobs ?? 0} color="success" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Users table */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary-400" /> Recent Users</h2>
          <div className="space-y-2">
            {recentUsers?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-semibold">
                  {(u.display_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.display_name || 'Unknown'}</div>
                  <div className="text-xs text-surface-700">{u.plan} plan · {u.credits} credits</div>
                </div>
                <span className={cn('badge text-xs capitalize', u.role === 'admin' ? 'bg-accent-500/15 text-accent-300' : 'bg-surface-300/40 text-surface-700')}>
                  {u.role}
                </span>
              </div>
            )) ?? (isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-sm text-surface-700">No users found</p>)}
          </div>
        </div>

        {/* Jobs table */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-primary-400" /> Recent Render Jobs</h2>
          <div className="space-y-2">
            {recentJobs?.map((j) => (
              <div key={j.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{j.resolution} · {j.format.toUpperCase()} · {j.aspect_ratio}</div>
                  <div className="text-xs text-surface-700">{j.fps} FPS · {new Date(j.created_at).toLocaleDateString()}</div>
                </div>
                <span className={cn(
                  'badge text-xs capitalize',
                  j.status === 'complete' ? 'bg-success-500/15 text-success-300' :
                  j.status === 'failed' ? 'bg-error-500/15 text-error-300' :
                  'bg-primary-500/15 text-primary-300'
                )}>{j.status}</span>
              </div>
            )) ?? (isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-sm text-surface-700">No jobs found</p>)}
          </div>
        </div>

        {/* System status */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary-400" /> System Status</h2>
          <div className="space-y-3">
            <StatusRow label="Database" status="operational" />
            <StatusRow label="Storage" status="operational" />
            <StatusRow label="Render Queue" status="operational" />
            <StatusRow label="AI Models" status="operational" />
            <StatusRow label="API Gateway" status="operational" />
          </div>
        </div>

        {/* API Keys */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary-400" /> API Configuration</h2>
          <div className="space-y-2 text-sm">
            <ConfigRow label="OpenAI API" status="configured" />
            <ConfigRow label="Stripe" status="configured" />
            <ConfigRow label="Razorpay" status="not_configured" />
            <ConfigRow label="AWS S3" status="configured" />
            <ConfigRow label="Cloudinary" status="not_configured" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStat({ icon: Icon, label, value, color, loading }: { icon: typeof Users; label: string; value: number; color: string; loading: boolean }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500/10 text-primary-400',
    secondary: 'bg-secondary-500/10 text-secondary-400',
    accent: 'bg-accent-500/10 text-accent-400',
    success: 'bg-success-500/10 text-success-400',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-surface-700">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorMap[color] ?? colorMap.primary)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold font-display">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-800">{label}</span>
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
        <span className="text-sm text-success-300 capitalize">{status}</span>
      </span>
    </div>
  );
}

function ConfigRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-surface-800">{label}</span>
      <span className={cn(
        'badge text-xs',
        status === 'configured' ? 'bg-success-500/15 text-success-300' : 'bg-surface-300/40 text-surface-700'
      )}>
        {status === 'configured' ? 'Configured' : 'Not Configured'}
      </span>
    </div>
  );
}
