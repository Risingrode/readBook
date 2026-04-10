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

    // Calculate streak and EXP
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastRead = new Date(userStats.lastReadDate);
    lastRead.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
    
    let newStreak = userStats.streakDays;
    let newFlameHealth = userStats.flameHealth;
    
    if (diffDays === 1) {
      newStreak += 1;
      newFlameHealth = Math.min(100, newFlameHealth + 10);
    } else if (diffDays > 1) {
      newStreak = 1;
      newFlameHealth = Math.max(0, newFlameHealth - (diffDays * 5)); // Penalty for missing days
    }

    const expGained = Math.floor((readingTime || 0) * 2) + 5; // 2 EXP per minute + 5 base
    const totalExp = userStats.exp + expGained;
    const newLevel = Math.floor(totalExp / 100) + 1;

    userStats = await prisma.userStats.update({
      where: { id: userStats.id },
      data: {
        streakDays: newStreak,
        totalReadMin: userStats.totalReadMin + (readingTime || 0),
        lastReadDate: new Date(),
        exp: totalExp,
        level: newLevel,
        flameHealth: newFlameHealth
      }
    });

    return NextResponse.json({ success: true, readingProgress, userStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
