import { create } from 'zustand';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface DropItem {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
}

interface GameState {
  exp: number;
  level: number;
  flameHealth: number;
  streakDays: number;
  inventory: DropItem[];
  activeDrop: DropItem | null;
  addExp: (amount: number) => void;
  setStats: (stats: Partial<GameState>) => void;
  triggerDrop: () => void;
  clearDrop: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  exp: 0,
  level: 1,
  flameHealth: 100,
  streakDays: 0,
  inventory: [],
  activeDrop: null,
  addExp: (amount) => set((state) => {
    const newExp = state.exp + amount;
    const newLevel = Math.floor(newExp / 100) + 1;
    return { exp: newExp, level: newLevel };
  }),
  setStats: (stats) => set((state) => ({ ...state, ...stats })),
  triggerDrop: () => {
    const roll = Math.random() * 100;
    let newDrop: DropItem | null = null;
    let expBonus = 0;

    if (roll < 1) { // 1% Legendary
      newDrop = { id: Date.now().toString(), name: "Epiphany Moment", rarity: 'legendary', description: "A profound realization. +50 EXP and a permanent title." };
      expBonus = 50;
    } else if (roll < 10) { // 9% Epic
      newDrop = { id: Date.now().toString(), name: "Cyberpunk Theme", rarity: 'epic', description: "Unlocked a new visual reading theme." };
    } else if (roll < 30) { // 20% Rare
      newDrop = { id: Date.now().toString(), name: "Shield Fragment", rarity: 'rare', description: "Collect 3 to protect your reading streak." };
    } else { // 70% Common
      // Just silent EXP for common drops to not interrupt too much
      expBonus = Math.floor(Math.random() * 6) + 5; // 5-10 exp
    }

    if (expBonus > 0) {
      get().addExp(expBonus);
    }

    if (newDrop) {
      set((state) => ({
        activeDrop: newDrop,
        inventory: [...state.inventory, newDrop!]
      }));
    }
  },
  clearDrop: () => set({ activeDrop: null })
}));
