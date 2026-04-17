import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { bookId, progress, readingTime } = await req.json();

    if (!bookId || typeof progress !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Update book progress
    const readingProgress = await prisma.readingProgress.upsert({
      where: { bookId },
      update: {
        progress,
        lastRead: new Date()
      },
      create: {
        bookId,
        progress,
        lastRead: new Date()
      }
    });

    // Update user stats (reading time only)
    let userStats = await prisma.userStats.findFirst();
    if (!userStats) {
      userStats = await prisma.userStats.create({ data: {} });
    }

    userStats = await prisma.userStats.update({
      where: { id: userStats.id },
      data: {
        totalReadMin: userStats.totalReadMin + (readingTime || 0),
        lastReadDate: new Date()
      }
    });

    return NextResponse.json({ success: true, readingProgress, userStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
