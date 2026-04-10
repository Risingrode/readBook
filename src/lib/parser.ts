import fs from 'fs/promises';
import path from 'path';

// Fix TS Next.js Turbopack compat by using dynamic require
if (typeof globalThis !== 'undefined') {
  if (!(globalThis as any).DOMMatrix) (globalThis as any).DOMMatrix = class DOMMatrix {};
  if (!(globalThis as any).ImageData) (globalThis as any).ImageData = class ImageData {};
  if (!(globalThis as any).Path2D) (globalThis as any).Path2D = class Path2D {};
}
const pdfParse = require('pdf-parse');
const epubModule = require('epub2');
const EPub = epubModule.EPub || epubModule.default || epubModule;

export async function parseEbookToText(filePath: string, format: string): Promise<string> {
  const ext = format.toLowerCase();
  
  if (ext === 'txt') {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }
  
  if (ext === 'pdf') {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }
  
  if (ext === 'epub') {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      epub.on('end', () => {
        let fullText = '';
        let chapterCount = epub.flow.length;
        let processedCount = 0;

        if (chapterCount === 0) {
          return resolve('');
        }

        epub.flow.forEach((chapter: any) => {
          epub.getChapter(chapter.id, (err: Error | null, text: string) => {
            if (err) {
              console.error('Error reading epub chapter', err);
            } else {
              // Basic strip HTML tags
              const cleanText = (text || '').replace(/<[^>]+>/g, ' ');
              fullText += cleanText + '\\n\\n';
            }
            processedCount++;
            if (processedCount === chapterCount) {
              resolve(fullText);
            }
          });
        });
      });
      epub.on('error', (err: Error) => {
        reject(err);
      });
      epub.parse();
    });
  }

  throw new Error('Unsupported format');
}
