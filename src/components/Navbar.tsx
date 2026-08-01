import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioWaveform, LayoutDashboard, Plus, LogOut, Settings, Shield, ChevronDown, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-primary-500/40 rounded-lg group-hover:bg-primary-400/50 transition-colors" />
            <AudioWaveform className="relative w-7 h-7 text-primary-400" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Audio2<span className="gradient-text">Motion</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate('/studio')} className="btn-primary text-sm hidden sm:flex">
              <Plus className="w-4 h-4" /> New Video
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm hidden sm:flex">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl pl-1.5 pr-2 py-1.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-semibold">
                  {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={cn('w-4 h-4 text-surface-700 transition-transform', menuOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 glass-strong rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/5">
                        <p className="text-sm font-medium text-white truncate">{profile?.display_name || 'User'}</p>
                        <p className="text-xs text-surface-700 truncate">{user.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="badge bg-primary-500/15 text-primary-300 capitalize">{profile?.plan ?? 'free'} plan</span>
                          <span className="badge bg-accent-500/15 text-accent-300">
                            <Sparkles className="w-3 h-3" /> {profile?.credits ?? 0} credits
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuItem icon={LayoutDashboard} label="Dashboard" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }} />
                        <MenuItem icon={Plus} label="New Project" onClick={() => { setMenuOpen(false); navigate('/studio'); }} />
                        <MenuItem icon={CreditCard} label="Billing" onClick={() => { setMenuOpen(false); navigate('/billing'); }} />
                        <MenuItem icon={Settings} label="Settings" onClick={() => { setMenuOpen(false); navigate('/settings'); }} />
                        {profile?.role === 'admin' && (
                          <MenuItem icon={Shield} label="Admin Panel" onClick={() => { setMenuOpen(false); navigate('/admin'); }} />
                        )}
                        <div className="my-1 h-px bg-white/5" />
                        <MenuItem icon={LogOut} label="Sign Out" onClick={() => { setMenuOpen(false); signOut(); }} danger />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth" className="btn-ghost text-sm">Sign In</Link>
            <Link to="/auth?mode=signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof LayoutDashboard; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        danger ? 'text-error-400 hover:bg-error-500/10' : 'text-surface-800 hover:bg-white/5 hover:text-white'
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
