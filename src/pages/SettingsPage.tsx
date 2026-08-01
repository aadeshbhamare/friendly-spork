import { useState } from 'react';
import { User, Save, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const { user } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user!.id);
    if (profile) setProfile({ ...profile, display_name: displayName });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6">Settings</h1>

      <div className="card p-6 mb-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary-400" /> Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-60" value={user?.email ?? ''} disabled />
          </div>
          <div className="flex items-center gap-3">
            <span className="badge bg-primary-500/15 text-primary-300 capitalize">{profile?.plan ?? 'free'} Plan</span>
            <span className="badge bg-accent-500/15 text-accent-300">{profile?.credits ?? 0} Credits</span>
            <span className="badge bg-surface-300/40 text-surface-700 capitalize">{profile?.role ?? 'user'}</span>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Storage</h2>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-surface-700">{(profile?.storage_used_mb ?? 0).toFixed(0)} MB used</span>
            <span className="text-surface-700">5 GB limit</span>
          </div>
          <div className="h-2 bg-surface-300 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, ((profile?.storage_used_mb ?? 0) / 5120) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
