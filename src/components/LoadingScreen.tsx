import { motion } from 'framer-motion';
import { AudioWaveform } from 'lucide-react';

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-0">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="absolute inset-0 blur-2xl bg-primary-500/30 rounded-full" />
        <AudioWaveform className="relative w-16 h-16 text-primary-400" />
      </motion.div>
      <p className="mt-6 text-surface-700 font-medium tracking-wide">{label}…</p>
    </div>
  );
}
