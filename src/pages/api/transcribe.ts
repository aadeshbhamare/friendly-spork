import type { NextApiRequest, NextApiResponse } from 'next';

// This API route accepts JSON: { audioBase64: string, filename?: string }
// It uploads the audio bytes to AssemblyAI, requests a transcript, polls for completion,
// and returns { segments: [{ text, start, end }] } where start/end are in seconds.

const ASSEMBLY_API = 'https://api.assemblyai.com/v2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  const body = req.body;
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY in env' });

  const { audioBase64, filename } = body;
  if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });

  try {
    // decode base64 to binary
    const buffer = Buffer.from(audioBase64, 'base64');

    // upload to AssemblyAI
    const uploadRes = await fetch(`${ASSEMBLY_API}/upload`, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Transfer-Encoding': 'chunked' },
      body: buffer,
    });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      return res.status(500).json({ error: 'upload failed', details: txt });
    }
    const uploadJson = await uploadRes.json();
    const audio_url = uploadJson.upload_url;

    // request transcript with word-level timestamps
    const transcriptRes = await fetch(`${ASSEMBLY_API}/transcript`, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url, punctuate: true, format_text: true, word_boost: [], word_timestamps: true }),
    });
    const transcriptJson = await transcriptRes.json();
    const id = transcriptJson.id;

    // poll until completed
    let status = transcriptJson.status;
    let finalJson = transcriptJson;
    while (status !== 'completed' && status !== 'error') {
      await new Promise((r) => setTimeout(r, 1500));
      const poll = await fetch(`${ASSEMBLY_API}/transcript/${id}`, { headers: { Authorization: apiKey } });
      finalJson = await poll.json();
      status = finalJson.status;
    }

    if (status === 'error') return res.status(500).json({ error: finalJson.error });

    // assemble segments from words (group by sentences using punctuation)
    const words = finalJson.words || [];
    const segments: { text: string; start: number; end: number }[] = [];
    // simple grouping: create segments by speaker pause or 5-second windows
    if (words.length) {
      let current: any = null;
      for (const w of words) {
        if (!current) {
          current = { text: w.text, start: w.start / 1000, end: w.end / 1000 };
        } else {
          // if time gap > 1.2s start new segment
          if (w.start / 1000 - current.end > 1.2) {
            segments.push(current);
            current = { text: w.text, start: w.start / 1000, end: w.end / 1000 };
          } else {
            current.text += (w.text.startsWith("'") ? w.text : ' ' + w.text);
            current.end = w.end / 1000;
          }
        }
      }
      if (current) segments.push(current);
    }

    return res.status(200).json({ segments });
  } catch (err: any) {
    console.error('transcription failed', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
