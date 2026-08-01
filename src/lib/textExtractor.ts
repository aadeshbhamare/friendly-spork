/**
 * Extracts text content from various file types for kinetic typography animation.
 * Supports: plain text, CSV, JSON, HTML, and basic document structures.
 * For binary formats (xlsx, docx, pdf), we extract what we can from the raw bytes.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  // Plain text formats
  if (type.startsWith('text/') || /\.(txt|md|csv|json|xml|html|svg|log|tsv)$/i.test(name)) {
    return await file.text();
  }

  // CSV / spreadsheet — parse as text
  if (type === 'text/csv' || /\.(csv|tsv)$/i.test(name)) {
    return await file.text();
  }

  // JSON
  if (type === 'application/json' || name.endsWith('.json')) {
    const text = await file.text();
    try {
      const obj = JSON.parse(text);
      return flattenJSON(obj);
    } catch {
      return text;
    }
  }

  // Excel / spreadsheet binary formats — extract strings from the raw bytes
  if (type.includes('spreadsheet') || /\.(xlsx|xls|ods)$/i.test(name)) {
    return extractStringsFromBinary(file, 2000);
  }

  // Word / document formats
  if (type.includes('word') || type.includes('document') || /\.(docx|doc|odt|rtf)$/i.test(name)) {
    return extractStringsFromBinary(file, 3000);
  }

  // PDF — extract readable strings
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractStringsFromBinary(file, 3000);
  }

  // PowerPoint
  if (type.includes('presentation') || /\.(pptx|ppt)$/i.test(name)) {
    return extractStringsFromBinary(file, 2000);
  }

  // Fallback: try reading as text
  try {
    return await file.text();
  } catch {
    return '';
  }
}

/**
 * Extracts human-readable ASCII strings from binary file data.
 * Finds sequences of printable characters 4+ long.
 */
async function extractStringsFromBinary(file: File, maxChars: number): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const strings: string[] = [];
  let current = '';
  let totalLen = 0;

  for (let i = 0; i < bytes.length && totalLen < maxChars; i++) {
    const byte = bytes[i];
    // Printable ASCII range (32-126) plus common whitespace
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else if (byte === 10 || byte === 13) {
      if (current.length >= 4) {
        strings.push(current.trim());
        totalLen += current.length;
      }
      current = '';
    } else {
      if (current.length >= 4) {
        strings.push(current.trim());
        totalLen += current.length;
      }
      current = '';
    }
  }
  if (current.length >= 4 && totalLen < maxChars) {
    strings.push(current.trim());
  }

  // Filter out strings that look like binary garbage (too many special chars)
  return strings
    .filter((s) => {
      const alpha = s.replace(/[^a-zA-Z0-9\s]/g, '').length;
      return alpha / s.length > 0.4 && s.length <= 200;
    })
    .join('\n')
    .slice(0, maxChars);
}

function flattenJSON(obj: unknown, prefix = ''): string {
  const lines: string[] = [];
  if (typeof obj === 'string') {
    lines.push(obj);
  } else if (typeof obj === 'number' || typeof obj === 'boolean') {
    lines.push(String(obj));
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => {
      const sub = flattenJSON(item, prefix);
      if (sub) lines.push(sub);
    });
  } else if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const sub = flattenJSON(val, prefix ? `${prefix}.${key}` : key);
      if (sub) lines.push(sub);
    }
  }
  return lines.join('\n');
}

/**
 * Splits extracted text into displayable segments for animation.
 * Each segment becomes a text overlay shown for a few seconds.
 */
export function textToOverlays(text: string, segmentDuration = 4): { text: string; start: number; duration: number }[] {
  // Split by lines first, then by sentences if lines are too long
  const rawLines = text.split(/\n+/).filter((l) => l.trim().length > 0);
  const segments: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length <= 80) {
      segments.push(trimmed);
    } else {
      // Split long lines by sentence or comma
      const parts = trimmed.split(/(?<=[.!?,;:])\s+/);
      for (const part of parts) {
        if (part.trim().length > 0) segments.push(part.trim());
      }
    }
  }

  return segments.slice(0, 50).map((text, i) => ({
    text,
    start: i * segmentDuration,
    duration: segmentDuration,
  }));
}
