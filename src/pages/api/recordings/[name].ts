// src/pages/api/recordings/[name].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query as { name?: string };
  if (!name) return res.status(400).end('name required');
  const tmpdir = os.tmpdir();
  const filepath = path.join(tmpdir, name);
  if (!fs.existsSync(filepath)) return res.status(404).end('not found');
  const stat = fs.statSync(filepath);
  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Content-Length', String(stat.size));
  const stream = fs.createReadStream(filepath);
  stream.pipe(res);
}
