/**
 * Client-safe utilities for reading experience
 */

/**
 * Detects if text starts with CJK character or CJK punctuation
 */
export function isCJK(text: string): boolean {
  return /^[\u4e00-\u9fa5\u201c\u2018\u300e\u300c]/.test(text.trim());
}

/**
 * Collapses single newlines and adds Hair Space (U+200A) between CJK and Latin/Numbers
 */
export function formatTypography(text: string): string {
  return text
    .replace(/\n/g, ' ');
  // Note: CJK-Latin spacing handled by CSS `text-autospace: ideograph-alpha`
  // as progressive enhancement. No manual hair space insertion to avoid
  // double-spacing when browsers adopt text-autospace.
}

/**
 * Splits raw text into clean paragraphs
 */
export function parseParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map(p => formatTypography(p).trim())
    .filter(Boolean);
}

/**
 * Split a single long paragraph into smaller pieces at sentence boundaries.
 * Only used when a single paragraph exceeds charsPerChunk.
 */
function splitLongParagraph(para: string, maxLen: number): string[] {
  if (para.length <= maxLen) return [para];

  // Try to split at sentence-ending punctuation
  const sentences = para.match(/[^。！？\.!?]+[。！？\.!?]+/g);
  if (sentences && sentences.length > 1) {
    // Check for unmatched trailing text (no terminal punctuation)
    const matched = sentences.join('');
    const remainder = para.slice(matched.length).trim();
    if (remainder) sentences.push(remainder);

    const result: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if (buf.length + s.length > maxLen && buf) {
        result.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) result.push(buf.trim());
    return result;
  }

  // Fallback: hard split
  const chunks: string[] = [];
  let i = 0;
  while (i < para.length) {
    chunks.push(para.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

/**
 * Split text into slides, respecting paragraph boundaries.
 * Each slide is an array of paragraphs (for proper rendering with <p> tags).
 * Paragraphs are never split across slides — long paragraphs are split at
 * sentence boundaries and each piece becomes its own paragraph within the slide.
 */
export function chunkText(text: string, charsPerChunk: number = 200): string[][] {
  if (!text) return [];

  const rawParagraphs = text
    .split(/\n\s*\n+/)
    .map(p => formatTypography(p).trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) return [];

  const slides: string[][] = [];
  let currentParagraphs: string[] = [];
  let currentLength = 0;

  for (const para of rawParagraphs) {
    const paraLen = para.length;

    // If adding this paragraph would exceed the chunk size and we already have content,
    // finish the current slide
    if (currentLength + paraLen > charsPerChunk && currentParagraphs.length > 0) {
      slides.push(currentParagraphs);
      currentParagraphs = [];
      currentLength = 0;
    }

    // If a single paragraph is longer than the chunk size, split it
    if (paraLen > charsPerChunk) {
      // First, push any existing content as its own slide
      if (currentParagraphs.length > 0) {
        slides.push(currentParagraphs);
        currentParagraphs = [];
        currentLength = 0;
      }
      // Split the long paragraph and make each piece a separate slide
      const pieces = splitLongParagraph(para, charsPerChunk);
      for (let i = 0; i < pieces.length; i++) {
        if (i < pieces.length - 1) {
          slides.push([pieces[i]]);
        } else {
          // Last piece: start a new current slide so subsequent short
          // paragraphs can be appended to it
          currentParagraphs = [pieces[i]];
          currentLength = pieces[i].length;
        }
      }
    } else {
      // Normal paragraph: add to current slide
      currentParagraphs.push(para);
      currentLength += paraLen;
    }
  }

  if (currentParagraphs.length > 0) {
    slides.push(currentParagraphs);
  }

  return slides;
}
