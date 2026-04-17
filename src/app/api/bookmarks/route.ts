import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/bookmarks?bookId=xxx — list bookmarks for a book
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { bookId },
      orderBy: { progress: 'asc' },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/bookmarks — create a bookmark
export async function POST(req: Request) {
  try {
    const { bookId, progress, label, mode, slideIndex } = await req.json();

    if (!bookId || typeof progress !== 'number') {
      return NextResponse.json({ error: 'bookId and progress are required' }, { status: 400 });
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        bookId,
        progress,
        label: label || null,
        mode: mode || 'paginate',
        slideIndex: slideIndex ?? null,
      },
    });

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/bookmarks?id=xxx — delete a bookmark
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.bookmark.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
