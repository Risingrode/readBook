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
  setStats: (stats: Partial<GameState>) => void;
  receiveDrop: (drop: DropItem) => void;
  clearDrop: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  exp: 0,
  level: 1,
  flameHealth: 100,
  streakDays: 0,
  inventory: [],
  activeDrop: null,
  setStats: (stats) => set((state) => ({ ...state, ...stats })),
  receiveDrop: (drop) => set((state) => ({
    activeDrop: drop,
    inventory: [...state.inventory, drop]
  })),
  clearDrop: () => set({ activeDrop: null })
}));
