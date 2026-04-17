/**
 * Utilities for rendering highlighted annotations in text
 */

export interface AnnotationData {
  id: string;
  text: string;
  prefix: string | null;
  suffix: string | null;
  note: string | null;
  color: string;
  progress: number;
  mode: string;
  slideIndex: number | null;
  createdAt: string;
}

export interface TextSegment {
  text: string;
  annotationId: string | null; // null = no highlight, otherwise the annotation id
  color: string | null;
}

/**
 * Find the character offset of `needle` in `haystack` using prefix+text+suffix matching.
 * Returns the start offset of the matched text, or -1 if not found.
 */
function findAnnotationOffset(haystack: string, annotation: AnnotationData): number {
  // Try exact prefix+text+suffix match first (most reliable)
  const context = (annotation.prefix || '') + annotation.text + (annotation.suffix || '');
  const contextIdx = haystack.indexOf(context);
  if (contextIdx !== -1) {
    return contextIdx + (annotation.prefix || '').length;
  }

  // Fallback: just find the text itself
  const textIdx = haystack.indexOf(annotation.text);
  if (textIdx !== -1) {
    return textIdx;
  }

  // Fallback: fuzzy — find longest matching substring
  // Try first 10 chars of text
  const head = annotation.text.slice(0, Math.min(10, annotation.text.length));
  const headIdx = haystack.indexOf(head);
  if (headIdx !== -1) {
    // Verify the rest matches roughly
    const remaining = annotation.text.slice(10);
    if (!remaining || haystack.slice(headIdx + 10, headIdx + 10 + remaining.length).includes(remaining.slice(0, 10))) {
      return headIdx;
    }
  }

  return -1;
}

/**
 * Given a paragraph text and a list of annotations, compute the segments
 * that make up this paragraph, with highlight information attached.
 * Each segment is either plain text or part of a highlight.
 */
export function computeSegments(paragraphText: string, annotations: AnnotationData[]): TextSegment[] {
  if (!paragraphText || annotations.length === 0) {
    return [{ text: paragraphText, annotationId: null, color: null }];
  }

  // Find all annotation ranges within this paragraph
  const ranges: { start: number; end: number; id: string; color: string }[] = [];

  for (const ann of annotations) {
    const offset = findAnnotationOffset(paragraphText, ann);
    if (offset !== -1 && offset < paragraphText.length) {
      const end = Math.min(offset + ann.text.length, paragraphText.length);
      ranges.push({ start: offset, end, id: ann.id, color: ann.color });
    }
  }

  if (ranges.length === 0) {
    return [{ text: paragraphText, annotationId: null, color: null }];
  }

  // Sort by start position
  ranges.sort((a, b) => a.start - b.start);

  // Merge overlapping ranges (keep first annotation's id)
  const merged: typeof ranges = [];
  for (const r of ranges) {
    if (merged.length > 0 && r.start < merged[merged.length - 1].end) {
      // Overlap: extend the end if needed
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const range of merged) {
    // Plain text before this range
    if (cursor < range.start) {
      segments.push({
        text: paragraphText.slice(cursor, range.start),
        annotationId: null,
        color: null,
      });
    }
    // Highlighted segment
    segments.push({
      text: paragraphText.slice(range.start, range.end),
      annotationId: range.id,
      color: range.color,
    });
    cursor = range.end;
  }

  // Remaining plain text
  if (cursor < paragraphText.length) {
    segments.push({
      text: paragraphText.slice(cursor),
      annotationId: null,
      color: null,
    });
  }

  return segments;
}

/**
 * Get highlight color class based on color key.
 * Returns a Tailwind-compatible bg class.
 */
export function getHighlightClass(color: string): string {
  switch (color) {
    case 'yellow':
      return 'bg-yellow-200/60 dark:bg-yellow-700/30';
    case 'green':
      return 'bg-green-200/60 dark:bg-green-700/30';
    case 'blue':
      return 'bg-blue-200/60 dark:bg-blue-700/30';
    case 'pink':
      return 'bg-pink-200/60 dark:bg-pink-700/30';
    case 'orange':
      return 'bg-orange-200/60 dark:bg-orange-700/30';
    default:
      return 'bg-yellow-200/60 dark:bg-yellow-700/30';
  }
}

/**
 * Get the context (prefix/suffix) around selected text from the full text.
 * Returns { prefix, suffix } — ~20 chars before and after the selection.
 */
export function getSelectionContext(fullText: string, selectedText: string, startOffset: number): {
  prefix: string;
  suffix: string;
} {
  const contextLen = 20;
  const prefix = fullText.slice(Math.max(0, startOffset - contextLen), startOffset);
  const endOffset = startOffset + selectedText.length;
  const suffix = fullText.slice(endOffset, Math.min(fullText.length, endOffset + contextLen));
  return { prefix, suffix };
}
