import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trash2, Plus, MessageCircle, Heart, Frown, Zap, Angry, Meh, Baby, UserRound, Bot, UserSquare, Crown, Mic, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CharacterType, CharacterEmotion, CharacterMessageConfig } from '@/types';

interface CharacterMessagePanelProps {
  onMessagesChange: (messages: CharacterMessageConfig[]) => void;
}

const CHARACTERS: { type: CharacterType; label: string; icon: typeof User }[] = [
  { type: 'boy', label: 'Boy', icon: Baby },
  { type: 'girl', label: 'Girl', icon: Heart },
  { type: 'robot', label: 'Robot', icon: Bot },
  { type: 'man', label: 'Man', icon: UserRound },
  { type: 'woman', label: 'Woman', icon: UserSquare },
  { type: 'elder', label: 'Elder', icon: Crown },
  { type: 'anime_boy', label: 'Anime Boy', icon: User },
  { type: 'anime_girl', label: 'Anime Girl', icon: Heart },
  { type: 'mascot', label: 'Mascot', icon: Zap },
];

const EMOTIONS: { type: CharacterEmotion; label: string; icon: typeof Heart }[] = [
  { type: 'happy', label: 'Happy', icon: Heart },
  { type: 'excited', label: 'Excited', icon: Zap },
  { type: 'sad', label: 'Sad', icon: Frown },
  { type: 'angry', label: 'Angry', icon: Angry },
  { type: 'surprised', label: 'Surprised', icon: Meh },
  { type: 'neutral', label: 'Neutral', icon: Meh },
];

const BUBBLE_STYLES = [
  { id: 'speech', label: 'Speech' },
  { id: 'thought', label: 'Thought' },
  { id: 'shout', label: 'Shout' },
  { id: 'text', label: 'Text Only' },
] as const;

const ENTER_ANIMATIONS = [
  { id: 'pop-in', label: 'Pop In' },
  { id: 'walk-in', label: 'Walk In' },
  { id: 'slide-in', label: 'Slide In' },
  { id: 'fade-in', label: 'Fade In' },
  { id: 'bounce-in', label: 'Bounce In' },
] as const;

export function CharacterMessagePanel({ onMessagesChange }: CharacterMessagePanelProps) {
  const [messages, setMessages] = useState<CharacterMessageConfig[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharacterType>('boy');
  const [emotion, setEmotion] = useState<CharacterEmotion>('happy');
  const [position, setPosition] = useState<'left' | 'center' | 'right'>('center');
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [talking, setTalking] = useState(true);
  const [scale, setScale] = useState(1);
  const [bubbleStyle, setBubbleStyle] = useState<'speech' | 'thought' | 'shout' | 'text'>('speech');
  const [enterAnimation, setEnterAnimation] = useState<'walk-in' | 'pop-in' | 'slide-in' | 'fade-in' | 'bounce-in'>('pop-in');
  const [expanded, setExpanded] = useState(false);

  function addMessage() {
    if (!message.trim()) return;
    const newMsg: CharacterMessageConfig = {
      characterType: selectedChar,
      message: message.trim(),
      emotion,
      position,
      startTime,
      duration,
      talking,
      scale,
      bubbleStyle,
      enterAnimation,
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    onMessagesChange(updated);
    setMessage('');
  }

  function removeMessage(index: number) {
    const updated = messages.filter((_, i) => i !== index);
    setMessages(updated);
    onMessagesChange(updated);
  }

  return (
    <div className="card p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-1"
      >
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary-400" /> In-World Character Messages
        </h3>
        <span className="text-xs text-surface-700">{expanded ? 'Hide' : 'Show'}</span>
      </button>
      <p className="text-xs text-surface-700 mb-3">
        Add an animated character who speaks your message — like DreamFace / trending video style. Character mouth moves while talking.
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Character picker */}
            <div>
              <label className="label">Character</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.type}
                    onClick={() => setSelectedChar(char.type)}
                    className={cn(
                      'rounded-lg p-2.5 border text-center transition-all',
                      selectedChar === char.type
                        ? 'border-primary-500/50 bg-primary-500/10 shadow-glow'
                        : 'border-white/5 bg-surface-200/30 hover:border-white/10'
                    )}
                  >
                    <char.icon className={cn('w-5 h-5 mx-auto mb-1', selectedChar === char.type ? 'text-primary-400' : 'text-surface-700')} />
                    <span className="text-xs">{char.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion picker */}
            <div>
              <label className="label">Emotion</label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emo) => (
                  <button
                    key={emo.type}
                    onClick={() => setEmotion(emo.type)}
                    className={cn(
                      'badge px-3 py-1.5 transition-colors',
                      emotion === emo.type
                        ? 'bg-primary-500/20 text-primary-300'
                        : 'bg-surface-200/40 text-surface-700 hover:text-white'
                    )}
                  >
                    <emo.icon className="w-3.5 h-3.5" /> {emo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="label">Position</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={cn(
                      'badge px-3 py-1.5 capitalize transition-colors',
                      position === pos
                        ? 'bg-primary-500/20 text-primary-300'
                        : 'bg-surface-200/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div>
              <label className="label">Message (what the character says)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Hey everyone, check out this awesome track!"
                className="input min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            {/* Bubble style */}
            <div>
              <label className="label">Bubble Style</label>
              <div className="flex flex-wrap gap-2">
                {BUBBLE_STYLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBubbleStyle(b.id)}
                    className={cn(
                      'badge px-3 py-1.5 transition-colors',
                      bubbleStyle === b.id
                        ? 'bg-primary-500/20 text-primary-300'
                        : 'bg-surface-200/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Enter animation */}
            <div>
              <label className="label">Enter Animation</label>
              <div className="flex flex-wrap gap-2">
                {ENTER_ANIMATIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setEnterAnimation(a.id)}
                    className={cn(
                      'badge px-3 py-1.5 transition-colors',
                      enterAnimation === a.id
                        ? 'bg-accent-500/20 text-accent-300'
                        : 'bg-surface-200/40 text-surface-700 hover:text-white'
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Talking toggle + scale */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Talking Animation</label>
                <button
                  onClick={() => setTalking(!talking)}
                  className={cn(
                    'btn text-sm w-full',
                    talking ? 'btn-primary' : 'btn-secondary'
                  )}
                >
                  {talking ? 'On (mouth moves)' : 'Off (static mouth)'}
                </button>
              </div>
              <div>
                <label className="label flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> Size: {scale.toFixed(1)}x</label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-primary-500 mt-2"
                />
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start (seconds)</label>
                <input
                  type="number"
                  className="input"
                  value={startTime}
                  min={0}
                  step={0.5}
                  onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="label">Duration (seconds)</label>
                <input
                  type="number"
                  className="input"
                  value={duration}
                  min={1}
                  step={0.5}
                  onChange={(e) => setDuration(parseFloat(e.target.value) || 5)}
                />
              </div>
            </div>

            <button onClick={addMessage} disabled={!message.trim()} className="btn-primary w-full">
              <Plus className="w-4 h-4" /> Add Character Message
            </button>

            {/* Message list */}
            {messages.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs text-surface-700 font-medium">Added messages ({messages.length})</div>
                {messages.map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface-200/40 rounded-lg p-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                      {(() => {
                        const Icon = CHARACTERS.find((c) => c.type === msg.characterType)?.icon ?? User;
                        return <Icon className="w-4 h-4 text-primary-400" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{msg.message}</div>
                      <div className="text-xs text-surface-700">
                        {msg.characterType} · {msg.emotion} · {msg.position} · {msg.startTime}s-{(msg.startTime + msg.duration).toFixed(1)}s
                        {msg.talking && ' · talking'}
                      </div>
                    </div>
                    <button onClick={() => removeMessage(i)} className="opacity-0 group-hover:opacity-100 btn-ghost !p-1.5 text-error-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length > 0 && !expanded && (
        <div className="text-xs text-surface-700 mt-1">{messages.length} character message(s) added</div>
      )}
    </div>
  );
}
