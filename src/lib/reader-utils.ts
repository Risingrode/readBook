/**
 * Client-safe utilities for reading experience
 */

/**
 * Utility to split long text into logical chunks (slides)
 */
export function chunkText(text: string, charsPerChunk: number = 200): string[] {
  if (!text) return [];
  
  // Split by common punctuation to form sentences
  const sentences = text.match(/[^。！？\.!\?]+[。！？\.!\?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    // If the sentence itself is too long, we might need to split it forcefully, but for now we just add it
    if (currentChunk.length + sentence.length > charsPerChunk && currentChunk !== "") {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence.trim();
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // Handle case where no punctuation was found or one huge chunk was created
  if (chunks.length === 1 && chunks[0].length > charsPerChunk * 2) {
      const splitChunks = [];
      let i = 0;
      while(i < chunks[0].length) {
          splitChunks.push(chunks[0].slice(i, i + charsPerChunk));
          i += charsPerChunk;
      }
      return splitChunks;
  }

  return chunks;
}

/**
 * Identifies key terms for the "Active Recall" game.
 */
export function identifyKeywords(text: string, count: number = 3): string[] {
  if (!text) return [];
  
  // Match English words or Chinese characters
  // We want continuous chunks of Chinese characters (e.g., words)
  // For simplicity without a complex segmenter, we grab chunks of 2-4 Chinese characters or English words > 4 chars.
  
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const englishWords = text.match(/\b[a-zA-Z]{5,}\b/g) || [];
  
  const allWords = [...chineseWords, ...englishWords];
  
  // Deduplicate and filter out very common stop words if needed
  const uniqueWords = Array.from(new Set(allWords));
  
  return uniqueWords.sort(() => 0.5 - Math.random()).slice(0, count);
}
