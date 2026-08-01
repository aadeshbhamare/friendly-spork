import { Link } from 'react-router-dom';
import { Home, AudioWaveform } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary-500/30 rounded-full" />
        <AudioWaveform className="relative w-16 h-16 text-primary-400" />
      </div>
      <h1 className="font-display text-5xl font-bold mb-2">404</h1>
      <p className="text-surface-700 mb-6">This page doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary">
        <Home className="w-4 h-4" /> Back Home
      </Link>
    </div>
  );
}
