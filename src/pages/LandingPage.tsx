import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AudioWaveform, Sparkles, Video, Camera, MessageSquare, Layers, Download, Zap, Globe, Shield, ArrowRight, Check, Music, Wand2 } from 'lucide-react';
import { VISUAL_PRESETS } from '@/lib/visualPresets';
import { useRef, useEffect } from 'react';
import { VisualRenderer } from '@/lib/visualRenderer';

export function LandingPage() {
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    canvas.width = 1200;
    canvas.height = 675;
    const renderer = new VisualRenderer(canvas);
    renderer.setPreset('galaxy_flow');
    renderer.setStyleConfig({ particleDensity: 0.6, glowIntensity: 0.7, motionSpeed: 0.4 });
    renderer.start();
    return () => renderer.destroy();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        <div className="absolute inset-0">
          <canvas ref={heroCanvasRef} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-0/40 via-surface-0/60 to-surface-0" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 badge bg-primary-500/15 text-primary-300 border border-primary-500/20 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Music Video Generation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-balance"
          >
            Turn Any Song Into a
            <br />
            <span className="gradient-text">Cinematic Music Video</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-surface-800 max-w-2xl mx-auto text-balance"
          >
            Upload your audio and let AI analyze the beat, mood, and energy — then generate
            stunning animated visuals with camera movement, particles, and cinematic effects.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/auth?mode=signup" className="btn-primary text-base px-7 py-3">
              <Wand2 className="w-5 h-5" /> Create Your First Video
            </Link>
            <Link to="/dashboard" className="btn-secondary text-base px-7 py-3">
              <Video className="w-5 h-5" /> View Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-surface-700"
          >
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success-400" /> No video editing skills needed</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success-400" /> 25+ visual styles</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success-400" /> Export to any platform</span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Everything You Need to Create</h2>
          <p className="text-surface-700 max-w-2xl mx-auto">From audio analysis to final export — a complete AI music video studio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card p-6 hover:border-primary-500/20 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                <f.icon className="w-5.5 h-5.5 text-primary-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
              <p className="text-sm text-surface-700 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Style Showcase */}
      <section className="py-20 px-4 bg-surface-50/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">25+ Visual Styles</h2>
            <p className="text-surface-700 max-w-2xl mx-auto">From galaxy nebulas to cyberpunk cities — pick a style or let AI choose.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {VISUAL_PRESETS.filter((p) => p.id !== 'auto').slice(0, 18).map((preset, i) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className="badge bg-surface-200/60 border border-white/5 text-surface-800 px-4 py-2 text-sm hover:bg-primary-500/15 hover:text-primary-300 hover:border-primary-500/20 transition-all cursor-default"
              >
                {preset.name}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">How It Works</h2>
          <p className="text-surface-700">Three steps from song to stunning video.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-6xl font-display font-bold text-primary-500/15 absolute -top-4 -left-2">{i + 1}</div>
              <div className="relative pl-4 pt-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center mb-4">
                  <step.icon className="w-5.5 h-5.5 text-primary-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1.5">{step.title}</h3>
                <p className="text-sm text-surface-700 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-surface-50/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Simple Pricing</h2>
            <p className="text-surface-700">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card p-6 flex flex-col ${plan.featured ? 'border-primary-500/30 shadow-glow' : ''}`}
              >
                {plan.featured && (
                  <div className="badge bg-primary-500/15 text-primary-300 self-start mb-3">Most Popular</div>
                )}
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.price !== 'Free' && <span className="text-sm text-surface-700">/mo</span>}
                </div>
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-surface-800">
                      <Check className="w-4 h-4 text-success-400 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth?mode=signup"
                  className={`mt-6 ${plan.featured ? 'btn-primary' : 'btn-secondary'} w-full`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AudioWaveform className="w-12 h-12 text-primary-400 mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Ready to Bring Your Music to Life?</h2>
          <p className="text-surface-700 mb-8">Join creators making professional music videos with AI.</p>
          <Link to="/auth?mode=signup" className="btn-primary text-base px-8 py-3 inline-flex">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AudioWaveform className="w-5 h-5 text-primary-400" />
            <span className="font-display font-semibold">Audio2Motion AI</span>
          </div>
          <p className="text-sm text-surface-700">AI-generated music videos from any song.</p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Music, title: 'AI Audio Analysis', desc: 'Detects BPM, tempo, genre, mood, energy, bass, vocals, beats, drops, and song sections automatically.' },
  { icon: Video, title: 'Cinematic Visuals', desc: 'AI environments, animated backgrounds, particles, lighting, and dynamic color grading — not just waveforms.' },
  { icon: Camera, title: 'Camera Engine', desc: 'Zoom, pan, orbit, tracking, dolly, tilt, roll, crane, parallax, and 360 camera movements.' },
  { icon: Wand2, title: 'Smart AI Mode', desc: 'No style chosen? AI picks animation, lighting, colors, scenes, and effects based on your song.' },
  { icon: MessageSquare, title: 'AI Chatbot Assistant', desc: 'Type "make it darker" or "use Galaxy Flow" — the assistant regenerates visuals without re-uploading.' },
  { icon: Layers, title: 'Timeline Editor', desc: 'Edit scenes, camera, effects, transitions, text, lyrics, images, and animation timing.' },
  { icon: Sparkles, title: 'Version History', desc: 'Unlimited generations with compare, restore, duplicate, rename, favorite, and delete.' },
  { icon: Download, title: 'Export Anywhere', desc: 'MP4, MOV, GIF, WebM in 1080p–8K, 30–120 FPS, and 16:9, 9:16, 1:1, 4:5 for any platform.' },
  { icon: Globe, title: 'Upload Assets', desc: 'Add backgrounds, logos, overlays, fonts, lyrics, subtitles, and character images.' },
];

const STEPS = [
  { icon: Music, title: 'Upload Your Song', desc: 'Drag and drop any audio file. The AI analyzes it instantly.' },
  { icon: Wand2, title: 'Pick a Style', desc: 'Choose from 25+ presets or let AI Auto decide the best look.' },
  { icon: Download, title: 'Generate & Export', desc: 'Get your video in any format, resolution, and aspect ratio.' },
];

const PLANS = [
  { name: 'Free', price: 'Free', cta: 'Start Free', features: ['10 credits / month', '720p export', '5 visual styles', 'Watermark-free'] },
  { name: 'Pro', price: '$19', cta: 'Go Pro', featured: true, features: ['100 credits / month', '1080p export', 'All 25+ styles', 'AI chatbot assistant', 'Version history'] },
  { name: 'Business', price: '$49', cta: 'Choose Business', features: ['500 credits / month', '4K export', 'Timeline editor', 'Priority rendering', 'Custom assets'] },
  { name: 'Enterprise', price: 'Custom', cta: 'Contact Us', features: ['Unlimited credits', '8K export', 'API access', 'Dedicated support', 'Custom AI models'] },
];
