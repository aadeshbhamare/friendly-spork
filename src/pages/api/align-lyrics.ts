// src/pages/api/align-lyrics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { alignLyricsToTranscript, WordStamp } from '../../src/lib/align';

const ASSEMBLY_API = 'https://api.assemblyai.com/v2';

async function transcribeBase64ToWords(audioBase64: string, apiKey: string): Promise<WordStamp[]> {
  const buffer = Buffer.from(audioBase64, 'base64');
  // upload
  const uploadRes = await fetch(`${ASSEMBLY_API}/upload`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Transfer-Encoding': 'chunked' },
    body: buffer,
  });
  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error('upload failed: ' + txt);
  }
  const uploadJson = await uploadRes.json();
  const audio_url = uploadJson.upload_url;

  // start transcript with word timestamps
  const transcriptRes = await fetch(`${ASSEMBLY_API}/transcript`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url, punctuate: true, format_text: true, word_timestamps: true }),
  });
  if (!transcriptRes.ok) {
    const txt = await transcriptRes.text();
    throw new Error('transcript request failed: ' + txt);
  }
  const transcriptJson = await transcriptRes.json();
  const id = transcriptJson.id;

  // poll
  let status = transcriptJson.status;
  let finalJson = transcriptJson;
  while (status !== 'completed' && status !== 'error') {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`${ASSEMBLY_API}/transcript/${id}`, { headers: { Authorization: apiKey } });
    finalJson = await poll.json();
    status = finalJson.status;
  }
  if (status === 'error') throw new Error('transcription error: ' + (finalJson.error || 'unknown'));

  const words = finalJson.words || [];
  // map to WordStamp
  return words.map((w: any) => ({ text: w.text, start: w.start / 1000, end: w.end / 1000 }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY in env' });

  const { audioBase64, lyricsText, transcriptWords } = req.body as {
    audioBase64?: string;
    lyricsText?: string;
    transcriptWords?: WordStamp[];
  };

  if (!lyricsText) return res.status(400).json({ error: 'lyricsText required' });

  try {
    let words: WordStamp[] | undefined = transcriptWords;
    if (!words) {
      if (!audioBase64) return res.status(400).json({ error: 'audioBase64 or transcriptWords required' });
      words = await transcribeBase64ToWords(audioBase64, apiKey);
    }

    const segments = alignLyricsToTranscript(lyricsText, words);
    return res.status(200).json({ segments });
  } catch (err: any) {
    console.error('align-lyrics failed', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
