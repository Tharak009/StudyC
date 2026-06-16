import { create } from "zustand";
import type { User } from "../types/auth";
import { tokenService } from "../services/token.service";

interface AuthState {
  user: User | null;
  initialized: boolean;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setInitialized: (initialized: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setSession: (user, accessToken) => {
    tokenService.set(accessToken);
    set({ user, initialized: true });
  },
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
  clearSession: () => {
    tokenService.set(null);
    set({ user: null, initialized: true });
  }
}));
