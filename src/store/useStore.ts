import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  loading: boolean;
  language: string;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setLanguage: (language: string) => void;
}

export const useStore = create<AppState>()((set) => ({
  user: null,
  loading: true,
  language: 'en',
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setLanguage: (language) => set({ language }),
}));
