// src/pages/api/upload-recording.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const { blobBase64, filename } = req.body as { blobBase64?: string; filename?: string };
    if (!blobBase64) return res.status(400).json({ error: 'blobBase64 required' });
    const buf = Buffer.from(blobBase64, 'base64');
    const tmpdir = os.tmpdir();
    const name = `${Date.now()}-${(filename || 'rec').replace(/[^a-z0-9_.-]/gi, '-')}`;
    const filepath = path.join(tmpdir, name);
    fs.writeFileSync(filepath, buf);
    // Expose via /api/recordings/[name]
    const url = `/api/recordings/${encodeURIComponent(name)}`;
    return res.status(200).json({ url });
  } catch (err: any) {
    console.error('/api/upload-recording', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
