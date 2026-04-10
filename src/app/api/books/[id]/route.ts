import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { progress: true }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    let content = '';
    if (book.extractedText) {
      try {
        const fullPath = path.join(process.cwd(), 'public', book.extractedText.replace('/books/', 'books/'));
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        console.error('Failed to read extracted text', e);
        content = 'Failed to load book content.';
      }
    } else {
      content = 'No readable text content found for this book.';
    }

    return NextResponse.json({ book, content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
