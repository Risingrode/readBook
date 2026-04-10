import fs from 'fs/promises';
const EPub = require('epub2');

/**
 * Server-only parser for multiple formats
 */
export async function parseEbookToText(filePath: string, format: string): Promise<string> {
  const contentBuffer = await fs.readFile(filePath);
  const ext = format.toLowerCase();
  
  if (ext === 'txt') {
    return contentBuffer.toString('utf-8');
  }

  if (ext === 'pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(contentBuffer);
      return data.text || '';
    } catch (e) {
      console.error('PDF parsing error', e);
      return '';
    }
  }

  if (ext === 'epub') {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      epub.on('end', () => {
        let text = '';
        const promises = epub.flow.map((chapter: any) => {
          return new Promise<void>((res) => {
            epub.getChapter(chapter.id, (error: any, chapterText: string) => {
              if (!error && chapterText) {
                // Strip HTML tags roughly
                const plain = chapterText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
                if (plain) {
                  text += plain + '\n\n';
                }
              }
              res();
            });
          });
        });
        Promise.all(promises).then(() => resolve(text));
      });
      epub.on('error', (err: any) => {
        console.error('EPub parsing error', err);
        resolve(contentBuffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, '')); // Fallback
      });
      epub.parse();
    });
  }
  
  // Basic sanitization fallback
  return contentBuffer.toString('utf-8');
}
