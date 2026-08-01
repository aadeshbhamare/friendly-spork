import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioWaveform, Mail, Lock, User, Github, Chrome, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

export function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInWithGitHub } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, displayName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'signin') {
      navigate('/dashboard');
    } else {
      setError('Check your email to confirm your account, then sign in.');
      setMode('signin');
    }
  }

  async function handleSocial(provider: 'google' | 'github') {
    setError(null);
    const fn = provider === 'google' ? signInWithGoogle : signInWithGitHub;
    const { error } = await fn();
    if (error) setError(error);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-primary-500/40 rounded-lg" />
            <AudioWaveform className="relative w-8 h-8 text-primary-400" />
          </div>
          <span className="font-display font-bold text-xl">Audio2<span className="gradient-text">Motion</span></span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card p-7"
        >
          <h1 className="font-display text-2xl font-bold mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-surface-700 mb-6">
            {mode === 'signin' ? 'Sign in to continue to your studio' : 'Start creating AI music videos'}
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl bg-error-500/10 border border-error-500/20 px-3 py-2.5 text-sm text-error-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button onClick={() => handleSocial('google')} className="btn-secondary text-sm py-2.5">
              <Chrome className="w-4 h-4" /> Google
            </button>
            <button onClick={() => handleSocial('github')} className="btn-secondary text-sm py-2.5">
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-white/5" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-100/60 backdrop-blur-xl px-3 text-xs text-surface-700">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700" />
                  <input className="input pl-10" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700" />
                <input className="input pl-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700" />
                <input className="input pl-10" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-surface-700">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
