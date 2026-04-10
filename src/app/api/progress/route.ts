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

    // Update user stats (simple gamification)
    let userStats = await prisma.userStats.findFirst();
    if (!userStats) {
      userStats = await prisma.userStats.create({ data: {} });
    }

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastRead = new Date(userStats.lastReadDate);
    lastRead.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
    
    let newStreak = userStats.streakDays;
    if (diffDays === 1) {
      newStreak += 1; // Read consecutive day
    } else if (diffDays > 1) {
      newStreak = 1; // Streak broken
    } else if (diffDays === 0 && userStats.streakDays === 0) {
      newStreak = 1; // First day
    }

    userStats = await prisma.userStats.update({
      where: { id: userStats.id },
      data: {
        streakDays: newStreak,
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
