import React, { useState } from 'react';
import type { Style } from '../lib/styleMatcher';
import { suggestStylesForImage } from '../lib/styleMatcher';

type Props = {
  targetClipId: string | null;
  onApplyStyle: (clipId: string, style: Style) => void;
};

export default function StyleSuggestions({ targetClipId, onApplyStyle }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Style[] | null>(null);
  const [features, setFeatures] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuggestions(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { features: f, suggestions: s } = await suggestStylesForImage(file, 3 as any);
      setFeatures(f);
      setSuggestions(s as Style[]);
    } catch (err: any) {
      console.error('suggestion failed', err);
      setError('Failed to analyze image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#0d1722', borderRadius: 8 }}>
      <h4 style={{ marginTop: 0 }}>Style suggestions from image</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="image/*" onChange={handleFile} />
        {loading && <span>Analyzing...</span>}
        {error && <span style={{ color: 'salmon' }}>{error}</span>}
      </div>

      {features && (
        <div style={{ marginTop: 8 }}>
          <strong>Image features:</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <div>Brightness: {(features.brightness || 0).toFixed(2)}</div>
            <div>Saturation: {(features.saturation || 0).toFixed(2)}</div>
            <div>Edge density: {(features.edgeDensity || 0).toFixed(2)}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(features.palette || []).map((p: string, i: number) => (
                <div key={i} style={{ width: 20, height: 20, background: p, borderRadius: 4 }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {suggestions && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {suggestions.map((s) => (
            <div key={s.id} style={{ width: 180, padding: 8, background: '#071024', borderRadius: 8 }}>
              <div style={{ width: '100%', height: 90, background: '#000', borderRadius: 6, overflow: 'hidden' }}>
                <img src={s.thumbnail} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.description}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <button disabled={!targetClipId} onClick={() => targetClipId && onApplyStyle(targetClipId, s)}>Apply</button>
                  <button onClick={() => alert('Preview not implemented in this build — apply to timeline to test')}>Preview</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
