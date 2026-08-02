// src/lib/align.ts
export type WordStamp = { text: string; start: number; end: number };

function normalize(s: string) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/[^a-z0-9'\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsFrom(s: string) {
  if (!s) return [];
  return normalize(s).split(' ').filter(Boolean);
}

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return dp[n];
}

function similar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const d = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return d <= Math.max(1, Math.floor(maxLen * 0.25));
}

/**
 * Align lyricsText (string with lines) to transcriptWords (WordStamp[])
 * Returns segments: [{text, start, end}] per lyric line
 */
export function alignLyricsToTranscript(lyricsText: string, transcriptWords: WordStamp[]) {
  const lyricLines = (lyricsText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lyricWordsPerLine = lyricLines.map((line) => wordsFrom(line));
  const flatLyricWords = lyricWordsPerLine.flat();

  const transcriptTokens = transcriptWords.map((w) => ({ text: normalize(w.text), start: w.start, end: w.end }));

  const matches: (number | null)[] = [];
  let ti = 0;
  for (let li = 0; li < flatLyricWords.length; li++) {
    const lw = flatLyricWords[li];
    let found = -1;
    const maxLookAhead = 40;
    for (let k = ti; k < Math.min(transcriptTokens.length, ti + maxLookAhead); k++) {
      if (similar(lw, transcriptTokens[k].text)) {
        found = k;
        break;
      }
    }
    if (found >= 0) {
      matches.push(found);
      ti = found + 1;
    } else {
      for (let k = Math.max(0, ti - 6); k < ti; k++) {
        if (similar(lw, transcriptTokens[k].text)) {
          found = k;
          break;
        }
      }
      if (found >= 0) {
        matches.push(found);
        ti = found + 1;
      } else {
        matches.push(null);
      }
    }
  }

  const segments: { text: string; start: number; end: number }[] = [];
  let globalIndex = 0;
  for (let li = 0; li < lyricLines.length; li++) {
    const lineWords = lyricWordsPerLine[li];
    if (lineWords.length === 0) continue;
    const wordMatchIndices: (number | null)[] = [];
    for (let w = 0; w < lineWords.length; w++, globalIndex++) {
      wordMatchIndices.push(matches[globalIndex]);
    }
    const matched = wordMatchIndices.filter((i) => i !== null) as number[];
    if (matched.length > 0) {
      const startStamp = transcriptTokens[matched[0]].start;
      const endStamp = transcriptTokens[matched[matched.length - 1]].end;
      segments.push({ text: lyricLines[li], start: startStamp, end: endStamp });
    } else {
      const prevIdx = (() => {
        for (let k = globalIndex - lineWords.length - 1; k >= 0; k--) {
          if (matches[k] !== null) return matches[k] as number;
        }
        return null;
      })();
      const nextIdx = (() => {
        for (let k = globalIndex; k < matches.length; k++) {
          if (matches[k] !== null) return matches[k] as number;
        }
        return null;
      })();
      let start = 0,
        end = 0;
      if (prevIdx !== null && nextIdx !== null) {
        start = transcriptTokens[prevIdx].end;
        end = transcriptTokens[nextIdx].start;
      } else if (prevIdx !== null) {
        start = transcriptTokens[prevIdx].end;
        end = start + 2.0 * lineWords.length;
      } else if (nextIdx !== null) {
        end = transcriptTokens[nextIdx].start;
        start = Math.max(0, end - 2.0 * lineWords.length);
      } else {
        start = 0;
        end = transcriptTokens.length ? transcriptTokens[transcriptTokens.length - 1].end : 3;
      }
      segments.push({ text: lyricLines[li], start, end });
    }
  }

  return segments;
}
