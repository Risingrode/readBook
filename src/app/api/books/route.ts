import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: {
        progress: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    // Also fetch basic user stats
    let userStats = await prisma.userStats.findFirst();
    if (!userStats) {
      userStats = await prisma.userStats.create({
        data: {
          streakDays: 0,
          totalReadMin: 0,
          exp: 0,
          level: 1,
          flameHealth: 100
        }
      });
    }

    return NextResponse.json({ books, userStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
