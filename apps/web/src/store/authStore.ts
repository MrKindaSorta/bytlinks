import { create } from 'zustand';
import type { User } from '@bytlinks/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasChecked: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setChecked: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  _hasChecked: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setChecked: () => set({ _hasChecked: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
