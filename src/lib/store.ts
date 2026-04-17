import { create } from 'zustand';

interface ReaderState {
  totalReadMin: number;
  setStats: (stats: Partial<Pick<ReaderState, 'totalReadMin'>>) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  totalReadMin: 0,
  setStats: (stats) => set((state) => ({ ...state, ...stats })),
}));
