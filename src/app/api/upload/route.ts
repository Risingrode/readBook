import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { parseEbookToText } from '@/lib/parser';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const title = file.name || '';
    const nameParts = title.split('.');
    const format = nameParts.length > 1 ? (nameParts.pop()?.toLowerCase() || '') : '';

    if (!['txt', 'pdf', 'epub'].includes(format)) {
      return NextResponse.json({ error: `Unsupported format: ${format} from ${title}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create DB entry first to get an ID
    const bookTitle = nameParts.join('.') || title;
    const book = await prisma.book.create({
      data: {
        title: bookTitle,
        format,
        filePath: '', // update later
      }
    });

    const fileExt = `.${format}`;
    const newFileName = `${book.id}${fileExt}`;
    const savePath = path.join(process.cwd(), 'public', 'books', newFileName);
    
    await fs.writeFile(savePath, buffer);

    // Parse to standardize text
    let parsedText = '';
    try {
      parsedText = await parseEbookToText(savePath, format);
      // Optional: Save parsed text to file to save DB space if large, but SQLite can handle small-to-med size text for demo
      // Or just save to text file
      const txtPath = path.join(process.cwd(), 'public', 'books', `${book.id}_parsed.txt`);
      await fs.writeFile(txtPath, parsedText);
      
      await prisma.book.update({
        where: { id: book.id },
        data: { 
          filePath: `/books/${newFileName}`,
          extractedText: `/books/${book.id}_parsed.txt`
        }
      });
    } catch (err) {
      console.error('Parsing error', err);
      await prisma.book.update({
        where: { id: book.id },
        data: { 
          filePath: `/books/${newFileName}` 
        }
      });
    }

    // Init progress
    await prisma.readingProgress.create({
      data: {
        bookId: book.id,
      }
    });

    return NextResponse.json({ success: true, book });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
