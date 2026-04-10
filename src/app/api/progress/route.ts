import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { bookId, progress, readingTime, action } = await req.json();

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
    let newFlameHealth = userStats.flameHealth;
    
    if (diffDays === 1) {
      newStreak += 1;
      newFlameHealth = Math.min(100, newFlameHealth + 10);
    } else if (diffDays > 1) {
      newStreak = 1;
      newFlameHealth = Math.max(0, newFlameHealth - (diffDays * 5)); // Penalty for missing days
    }

    // Calculate Server-Side EXP
    let expGained = Math.floor((readingTime || 0) * 2); 
    
    // Base exp for just updating progress first time in a day
    if (diffDays >= 1) expGained += 5; 

    // Action-based EXP (Secure)
    if (action === 'slide_read') {
      expGained += 10;
    } else if (action === 'keyword_capture') {
      expGained += 25;
    } else if (action === 'warmup_complete') {
      expGained += 50;
    } else if (action === 'skip_warmup') {
      expGained -= 20; // Skip penalty
    } else if (action === 'unlock_cliffhanger') {
      expGained -= 50; // Cliffhanger unlock penalty
    }

    // Roll for Loot Drop (Server-Side)
    let activeDrop = null;
    if (action) {
      const roll = Math.random() * 100;
      let newDrop = null;

      if (roll < 1) { // 1% Legendary
        newDrop = { name: "Epiphany Moment", type: 'legendary', quantity: 1 };
        expGained += 50;
      } else if (roll < 10) { // 9% Epic
        newDrop = { name: "Cyberpunk Theme", type: 'epic', quantity: 1 };
      } else if (roll < 30) { // 20% Rare
        newDrop = { name: "Shield Fragment", type: 'rare', quantity: 1 };
      } else {
        // 70% Common: just silent EXP
        expGained += Math.floor(Math.random() * 6) + 5; // 5-10 exp
      }

      if (newDrop) {
        // Save drop to database
        const inventoryItem = await prisma.inventory.findFirst({
          where: { itemName: newDrop.name }
        });

        if (inventoryItem) {
          await prisma.inventory.update({
            where: { id: inventoryItem.id },
            data: { quantity: inventoryItem.quantity + 1 }
          });
        } else {
          await prisma.inventory.create({
            data: {
              itemName: newDrop.name,
              type: newDrop.type,
              quantity: 1
            }
          });
        }
        
        activeDrop = {
          id: Date.now().toString(),
          name: newDrop.name,
          rarity: newDrop.type,
          description: newDrop.type === 'legendary' ? "A profound realization. +50 EXP and a permanent title." :
                       newDrop.type === 'epic' ? "Unlocked a new visual reading theme." :
                       "Collect 3 to protect your reading streak."
        };
      }
    }

    const totalExp = Math.max(0, userStats.exp + expGained);
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

    return NextResponse.json({ success: true, readingProgress, userStats, activeDrop });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
