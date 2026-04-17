import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/annotations/export?bookId=xxx — export annotations as Markdown
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { annotations: { orderBy: { progress: 'asc' } } },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const annotations = book.annotations;
    if (annotations.length === 0) {
      return NextResponse.json({ error: 'No annotations to export' }, { status: 400 });
    }

    // Build Markdown content
    const lines: string[] = [];
    lines.push(`# ${book.title} 笔记`);
    lines.push('');
    lines.push(`> 共 ${annotations.length} 条标注，导出于 ${new Date().toLocaleDateString('zh-CN')}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const ann of annotations) {
      // Highlighted text as blockquote
      lines.push(`> ${ann.text.replace(/\n/g, '\n> ')}`);
      lines.push('>');

      // Note if present
      if (ann.note) {
        lines.push(`> **笔记：** ${ann.note.replace(/\n/g, '\n> ')}`);
        lines.push('>');
      }

      // Metadata line
      const position = ann.mode === 'paginate' && ann.slideIndex != null
        ? `第 ${ann.slideIndex + 1} 页`
        : `${Math.round(ann.progress)}%`;
      const date = new Date(ann.createdAt).toLocaleDateString('zh-CN');
      lines.push(`*— ${position} · ${date}*`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const markdown = lines.join('\n');
    const filename = encodeURIComponent(`${book.title}_笔记.md`);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
