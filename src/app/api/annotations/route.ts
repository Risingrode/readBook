import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/annotations?bookId=xxx — list annotations for a book
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const annotations = await prisma.annotation.findMany({
      where: { bookId },
      orderBy: { progress: 'asc' },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/annotations — create an annotation
export async function POST(req: Request) {
  try {
    const { bookId, text, prefix, suffix, note, color, progress, mode, slideIndex } = await req.json();

    if (!bookId || !text || typeof progress !== 'number') {
      return NextResponse.json({ error: 'bookId, text, and progress are required' }, { status: 400 });
    }

    const annotation = await prisma.annotation.create({
      data: {
        bookId,
        text,
        prefix: prefix || null,
        suffix: suffix || null,
        note: note || null,
        color: color || 'yellow',
        progress,
        mode: mode || 'paginate',
        slideIndex: slideIndex ?? null,
      },
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/annotations — update an annotation (note text)
export async function PUT(req: Request) {
  try {
    const { id, note } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const annotation = await prisma.annotation.update({
      where: { id },
      data: { note: note ?? null },
    });

    return NextResponse.json({ annotation });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/annotations?id=xxx — delete an annotation
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.annotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
