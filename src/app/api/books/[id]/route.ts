import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { progress: true, bookmarks: { orderBy: { progress: 'asc' } }, annotations: { orderBy: { progress: 'asc' } } }
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    // Try deleting file
    try {
      if (book.filePath) {
        await fs.unlink(path.join(process.cwd(), 'public', book.filePath.replace('/books/', 'books/')));
      }
    } catch (e) {
      console.error('File delete error', e);
    }
    
    try {
      if (book.extractedText) {
        await fs.unlink(path.join(process.cwd(), 'public', book.extractedText.replace('/books/', 'books/')));
      }
    } catch (e) {
      console.error('Text file delete error', e);
    }

    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        title: body.title
      }
    });
    
    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}